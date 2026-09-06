import { NextResponse } from 'next/server';
import { generateSampleTemplateBuffer } from '@/lib/excel';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const buffer = generateSampleTemplateBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="3_Eyed_Raven_Task_Template.xlsx"',
      },
    });
  } catch (error) {
    console.error('Error generating template:', error);
    return NextResponse.json({ error: 'Failed to generate Excel template' }, { status: 500 });
  }
}
