import { NextResponse } from 'next/server';
import { VERIFIED_GOVT_EXAMS } from '../../../data/govtExamsData';
import { STATE_UT_PSC_DIRECTORIES, CENTRAL_RECRUITMENT_TIMETABLE } from '../../../data/govtCalendarData';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return handleSync(req);
}

export async function POST(req: Request) {
  return handleSync(req);
}

async function handleSync(_req: Request) {
  try {
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    let activeCount = 0;
    let archivedCount = 0;
    let closingThisWeekCount = 0;

    const auditedExams = VERIFIED_GOVT_EXAMS.map((exam) => {
      const parts = exam.importantDates.applyEndDate.split('-').map(Number);
      let isPastDeadline = false;
      let daysLeft = 99;

      if (parts.length === 3 && !isNaN(parts[0])) {
        const [year, month, day] = parts;
        const targetMidnight = new Date(year, month - 1, day).getTime();
        const diffDays = Math.round((targetMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
        isPastDeadline = diffDays < 0;
        daysLeft = diffDays;
      }

      if (isPastDeadline) {
        archivedCount++;
      } else {
        activeCount++;
        if (daysLeft >= 0 && daysLeft <= 7) {
          closingThisWeekCount++;
        }
      }

      return {
        id: exam.id,
        title: exam.title,
        conductingBody: exam.conductingBody,
        category: exam.category,
        state: exam.state,
        applyEndDate: exam.importantDates.applyEndDate,
        isPastDeadline,
        daysLeft: isPastDeadline ? null : daysLeft,
        status: isPastDeadline ? 'archived' : 'active',
      };
    });

    return NextResponse.json({
      success: true,
      syncTimestamp: now.toISOString(),
      status: 'healthy',
      telemetry: {
        totalVerifiedExams: VERIFIED_GOVT_EXAMS.length,
        activeOpenExams: activeCount,
        archivedClosedExams: archivedCount,
        closingThisWeek: closingThisWeekCount,
        monitoredStateCommissions: STATE_UT_PSC_DIRECTORIES.length,
        monitoredCentralTimetables: CENTRAL_RECRUITMENT_TIMETABLE.length,
      },
      activeExams: auditedExams.filter((e) => !e.isPastDeadline),
      archivedExams: auditedExams.filter((e) => e.isPastDeadline),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Govt exam synchronization failed',
      },
      { status: 500 }
    );
  }
}
