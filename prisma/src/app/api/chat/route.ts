import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'nextauth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { executeAiFallbackChain } from '@/lib/ai/fallbackChain';
import { buildSystemPrompt } from '@/lib/ai/prompts';
import { MoodMode } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { characterId, message, mood = 'NORMAL' } = await req.json();

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Tier Rate Limiting Check
    if (user.tier === 'FREE') {
      const now = new Date();
      const isNewDay = now.getTime() - new Date(user.lastMsgReset).getTime() > 86400000;
      const count = isNewDay ? 0 : user.dailyMsgCount;

      if (count >= 20) {
        return NextResponse.json(
          { error: 'Daily limit reached. Upgrade to Premium for unlimited chats.' },
          { status: 429 }
        );
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          dailyMsgCount: count + 1,
          lastMsgReset: isNewDay ? now : user.lastMsgReset,
        },
      });
    }

    // Adult Mode Gating Check
    if (mood === 'ADULT') {
      if (!user.isAgeVerified || user.tier !== 'PREMIUM') {
        return NextResponse.json(
          { error: 'Adult mode requires Premium membership and verified 18+ age status.' },
          { status: 403 }
        );
      }
    }

    const character = await prisma.character.findUnique({ where: { id: characterId } });
    if (!character) return NextResponse.json({ error: 'Character not found' }, { status: 404 });

    let chat = await prisma.chat.findUnique({
      where: { userId_characterId: { userId: user.id, characterId } },
      include: { summary: true, messages: { take: 10, orderBy: { createdAt: 'desc' } } },
    });

    if (!chat) {
      chat = await prisma.chat.create({
        data: { userId: user.id, characterId, currentMood: mood as MoodMode },
        include: { summary: true, messages: true },
      });
    }

    // Save User Message
    await prisma.message.create({
      data: { chatId: chat.id, sender: 'user', content: message, mood: mood as MoodMode },
    });

    const recentHistory = chat.messages.reverse().map((m) => ({
      role: m.sender as 'user' | 'assistant',
      content: m.content,
    }));

    const systemPrompt = buildSystemPrompt(character, mood as MoodMode, chat.summary?.summary);

    const fullMessagesPayload = [
      { role: 'system' as const, content: systemPrompt },
      ...recentHistory,
      { role: 'user' as const, content: message },
    ];

    const stream = await executeAiFallbackChain({ messages: fullMessagesPayload });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err: any) {
    console.error('Chat API Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
