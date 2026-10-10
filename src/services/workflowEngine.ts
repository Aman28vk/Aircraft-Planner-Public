import {
  Task,
  TaskDependency,
  Aircraft,
  Profile,
  Team,
  InAppNotification,
  EmailLog,
  ActivityLog,
  AuditLog,
  TaskTemplate,
  TaskChecklistItem,
  LifecycleTemplateTask,
} from '../types';
import { formatIndiaDate } from '../utils/dateUtils';

export interface WorkflowEvaluationResult {
  updatedTasks: Task[];
  unlockedTaskIds: string[];
  newNotifications: InAppNotification[];
  newEmailLogs: EmailLog[];
  newActivityLogs: ActivityLog[];
  newAuditLogs: AuditLog[];
}

/**
 * Core dynamic workflow engine that processes task completion, evaluates
 * the directed acyclic graph (DAG) of task dependencies, unlocks successor tasks,
 * and generates transactional notifications and audit logs.
 */
export class WorkflowEngine {
  /**
   * Evaluates dependencies dynamically when a task is completed.
   */
  static handleTaskCompletion(
    completedTask: Task,
    currentUser: Profile,
    allTasks: Task[],
    allDependencies: TaskDependency[],
    allAircraft: Aircraft[],
    allProfiles: Profile[],
    allTeams: Team[]
  ): WorkflowEvaluationResult {
    const aircraft = allAircraft.find((a) => a.id === completedTask.aircraft_id);
    const msn = aircraft ? aircraft.msn : 'Unknown MSN';

    const now = new Date().toISOString();
    const updatedTasks: Task[] = [];
    const unlockedTaskIds: string[] = [];
    const newNotifications: InAppNotification[] = [];
    const newEmailLogs: EmailLog[] = [];
    const newActivityLogs: ActivityLog[] = [];
    const newAuditLogs: AuditLog[] = [];

    // 1. Log completion of current task
    newActivityLogs.push({
      id: crypto.randomUUID(),
      aircraft_id: completedTask.aircraft_id,
      task_id: completedTask.id,
      user_id: currentUser.id,
      action: 'TASK_COMPLETED',
      details: `${currentUser.full_name} marked task "${completedTask.name}" as COMPLETED.`,
      created_at: now,
    });

    newAuditLogs.push({
      id: crypto.randomUUID(),
      user_id: currentUser.id,
      action: 'UPDATE_TASK_STATUS',
      table_name: 'tasks',
      record_id: completedTask.id,
      old_values: { status: completedTask.status },
      new_values: { status: 'COMPLETED', completed_at: now },
      created_at: now,
    });

    // 2. Find all tasks that depend directly on this completed task
    const directSuccessorDependencies = allDependencies.filter(
      (dep) => dep.depends_on_task_id === completedTask.id
    );

    // Group dependencies by successor task
    const successorTaskIds = Array.from(
      new Set(directSuccessorDependencies.map((d) => d.task_id))
    );

    // Map of updated task states
    const taskStateMap = new Map<string, Task>();
    allTasks.forEach((t) => {
      if (t.id === completedTask.id) {
        taskStateMap.set(t.id, {
          ...t,
          status: 'COMPLETED',
          completed_at: now,
          updated_at: now,
        });
      } else {
        taskStateMap.set(t.id, t);
      }
    });

    // 3. For each successor, check whether ALL predecessors are completed
    for (const successorId of successorTaskIds) {
      const successorTask = taskStateMap.get(successorId);
      if (!successorTask) continue;

      // Find ALL dependencies required for this successor
      const requiredDependencies = allDependencies.filter(
        (dep) => dep.task_id === successorId
      );

      const allPredecessorsSatisfied = requiredDependencies.every((dep) => {
        const predTask = taskStateMap.get(dep.depends_on_task_id);
        return predTask && predTask.status === 'COMPLETED';
      });

      // If all predecessors are satisfied and successor is currently waiting or blocked
      if (
        allPredecessorsSatisfied &&
        (successorTask.status === 'WAITING' ||
          successorTask.status === 'WAITING_FOR_DEPENDENCY' ||
          successorTask.status === 'BLOCKED' ||
          successorTask.status === 'NOT_STARTED')
      ) {
        const unlockedTask: Task = {
          ...successorTask,
          status: 'READY',
          updated_at: now,
        };

        taskStateMap.set(successorId, unlockedTask);
        updatedTasks.push(unlockedTask);
        unlockedTaskIds.push(successorId);

        // Identify assignee or fall back to team lead
        let assigneeId = unlockedTask.assigned_user_id;
        if (!assigneeId) {
          const team = allTeams.find((t) => t.id === unlockedTask.team_id);
          if (team && team.team_lead_id) {
            assigneeId = team.team_lead_id;
          }
        }

        const assignee = allProfiles.find((p) => p.id === assigneeId);
        const assigneeName = assignee ? assignee.full_name : 'Assigned Specialist';
        const assigneeEmail = assignee ? assignee.email : 'operations@alarisaerospace.com';

        // 4. Create in-app notification
        const notification: InAppNotification = {
          id: crypto.randomUUID(),
          user_id: assigneeId || currentUser.id,
          task_id: unlockedTask.id,
          aircraft_id: unlockedTask.aircraft_id,
          type: 'DEPENDENCY_UNLOCKED',
          subject: `MSN ${msn} - Action Required: ${unlockedTask.name}`,
          message: `The predecessor task "${completedTask.name}" has been completed. Your task "${unlockedTask.name}" is now READY to start.`,
          status: 'UNREAD',
          sent_at: now,
          email_status: 'SIMULATED',
          created_at: now,
        };
        newNotifications.push(notification);

        // 5. Generate transactional email matching prompt requirement
        const emailSubject = `MSN ${msn} - Action Required: ${unlockedTask.name}`;
        const formattedDueDate = unlockedTask.due_date
          ? formatIndiaDate(unlockedTask.due_date, 'medium')
          : 'Pending Schedule';

        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b1329; color: #f8fafc; margin: 0; padding: 24px; }
    .card { background-color: #142247; border: 1px solid #1e2f5b; border-radius: 12px; padding: 28px; max-width: 580px; margin: 0 auto; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); }
    .badge { display: inline-block; background-color: #0284c7; color: white; padding: 4px 12px; border-radius: 6px; font-weight: 600; font-size: 13px; text-transform: uppercase; margin-bottom: 16px; }
    h2 { margin-top: 0; color: #ffffff; font-size: 20px; }
    p { color: #cbd5e1; font-size: 15px; line-height: 1.6; }
    .detail-box { background-color: #0b1329; border: 1px solid #1e2f5b; border-radius: 8px; padding: 16px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
    .detail-label { color: #94a3b8; font-weight: 500; }
    .detail-value { color: #f8fafc; font-weight: 600; }
    .btn { display: inline-block; background-color: #0284c7; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 12px; text-align: center; }
    .footer { margin-top: 28px; font-size: 12px; color: #64748b; border-top: 1px solid #1e2f5b; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">Workflow Engine Notification</span>
    <h2>Task Ready to Start</h2>
    <p>Hello <strong>${assigneeName}</strong>,</p>
    <p>The previous task <strong>"${completedTask.name}"</strong> for <strong>MSN ${msn}</strong> has been completed by ${currentUser.full_name}.</p>
    <p>Your dependent task is now unlocked and ready to proceed:</p>
    
    <div class="detail-box">
      <div class="detail-row">
        <span class="detail-label">Task:</span>
        <span class="detail-value">${unlockedTask.name}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Aircraft MSN:</span>
        <span class="detail-value">MSN ${msn}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Priority:</span>
        <span class="detail-value">${unlockedTask.priority}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Due Date:</span>
        <span class="detail-value">${formattedDueDate}</span>
      </div>
    </div>

    <p>Please open the Aircraft Lifecycle Management system to review and complete the task.</p>
    <a href="#/tasks/${unlockedTask.id}" class="btn">OPEN TASK</a>

    <div class="footer">
      Regards,<br>
      <strong>Aircraft Lifecycle Management & Task Planner</strong><br>
      Automated Workflow System &bull; Alaris Aerospace Systems
    </div>
  </div>
</body>
</html>
        `.trim();

        newEmailLogs.push({
          id: crypto.randomUUID(),
          recipient_email: assigneeEmail,
          recipient_name: assigneeName,
          subject: emailSubject,
          html_body: emailHtml,
          trigger_event: 'DEPENDENCY_UNLOCKED',
          task_id: unlockedTask.id,
          aircraft_msn: msn,
          status: 'SIMULATED_DEV_MODE',
          created_at: now,
        });

        // 6. Log system activity
        newActivityLogs.push({
          id: crypto.randomUUID(),
          aircraft_id: unlockedTask.aircraft_id,
          task_id: unlockedTask.id,
          action: 'DEPENDENCY_UNLOCKED',
          details: `System automatically unlocked task "${unlockedTask.name}" and notified ${assigneeName}.`,
          created_at: now,
        });

        newAuditLogs.push({
          id: crypto.randomUUID(),
          action: 'AUTO_UNLOCK_TASK',
          table_name: 'tasks',
          record_id: unlockedTask.id,
          old_values: { status: successorTask.status },
          new_values: { status: 'READY' },
          created_at: now,
        });
      }
    }

    return {
      updatedTasks,
      unlockedTaskIds,
      newNotifications,
      newEmailLogs,
      newActivityLogs,
      newAuditLogs,
    };
  }

  /**
   * Instantiates a template for an aircraft project.
   * Creates actual tasks, checklists, and dependency mappings with smart role resolution.
   */
  static applyTemplateToAircraft(
    aircraft: Aircraft,
    template: TaskTemplate,
    teams: Team[],
    profiles: Profile[]
  ): {
    tasks: Task[];
    checklists: TaskChecklistItem[];
    dependencies: TaskDependency[];
  } {
    // Extract template tasks from all buckets
    const templateTasks: (LifecycleTemplateTask & { bucket_id?: string; bucket_code?: string })[] = [];
    if (template.buckets && template.buckets.length > 0) {
      template.buckets.forEach((b) => {
        if (b.tasks) {
          b.tasks.forEach((t) => {
            templateTasks.push({
              ...t,
              bucket_id: b.id,
              bucket_code: b.code,
            });
          });
        }
      });
    }

    if (templateTasks.length === 0) {
      return { tasks: [], checklists: [], dependencies: [] };
    }

    const templateTaskIdToActualId = new Map<string, string>();
    const templateTaskNameToActualId = new Map<string, string>();
    const newTasks: Task[] = [];
    const newChecklists: TaskChecklistItem[] = [];
    const newDependencies: TaskDependency[] = [];
    const now = new Date().toISOString();

    const baseDate = aircraft.acquisition_date
      ? new Date(aircraft.acquisition_date)
      : new Date();

    let cumulativeDays = 0;

    // 1. Create tasks from template tasks
    templateTasks.forEach((tt, idx) => {
      const actualTaskId = crypto.randomUUID();
      templateTaskIdToActualId.set(tt.id, actualTaskId);
      templateTaskNameToActualId.set(tt.name, actualTaskId);

      // Smart role resolution: match by team_name or default_role
      const team = teams.find(
        (t) =>
          t.name.toLowerCase() === (tt.team_name || '').toLowerCase() ||
          t.name.toLowerCase() === (tt.default_role || '').toLowerCase()
      ) || teams[0];
      let assignedUserId: string | undefined;

      if (team && team.team_lead_id) {
        assignedUserId = team.team_lead_id;
      }

      // Calculate schedule dates based on cumulative duration
      const startDate = new Date(baseDate);
      startDate.setDate(startDate.getDate() + cumulativeDays);
      const dueDate = new Date(startDate);
      dueDate.setDate(dueDate.getDate() + tt.estimated_duration_days);

      cumulativeDays += Math.max(1, Math.floor(tt.estimated_duration_days * 0.7));

      // If task has predecessors in template, initial status is WAITING; otherwise NOT_STARTED or READY
      const hasPredecessors = tt.predecessor_names && tt.predecessor_names.length > 0;
      const initialStatus = hasPredecessors ? 'WAITING' : (idx === 0 ? 'IN_PROGRESS' : 'READY');

      const task: Task = {
        id: actualTaskId,
        task_number: idx + 1,
        aircraft_id: aircraft.id,
        stage_id: '',
        team_id: team ? team.id : (teams[0]?.id || ''),
        assigned_user_id: assignedUserId,
        name: tt.name,
        description: tt.description,
        status: initialStatus,
        priority: tt.priority,
        start_date: startDate.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        estimated_duration_days: tt.estimated_duration_days,
        order_index: tt.order_index || idx + 1,
        created_at: now,
        updated_at: now,
      };

      newTasks.push(task);

      // Add checklists
      if (tt.checklist_items && tt.checklist_items.length > 0) {
        tt.checklist_items.forEach((itemTitle: string, itemIdx: number) => {
          newChecklists.push({
            id: crypto.randomUUID(),
            task_id: actualTaskId,
            title: itemTitle,
            is_completed: false,
            order_index: itemIdx + 1,
          });
        });
      }
    });

    // 2. Build dependency records from predecessor_names
    templateTasks.forEach((tt) => {
      if (tt.predecessor_names && tt.predecessor_names.length > 0) {
        const actualSuccessorId = templateTaskIdToActualId.get(tt.id);
        if (!actualSuccessorId) return;

        tt.predecessor_names.forEach((predName: string) => {
          const actualPredecessorId = templateTaskNameToActualId.get(predName);
          if (actualPredecessorId) {
            newDependencies.push({
              id: crypto.randomUUID(),
              task_id: actualSuccessorId,
              depends_on_task_id: actualPredecessorId,
              dependency_type: 'FINISH_TO_START',
              created_at: now,
            });
          }
        });
      }
    });

    return {
      tasks: newTasks,
      checklists: newChecklists,
      dependencies: newDependencies,
    };
  }
}

