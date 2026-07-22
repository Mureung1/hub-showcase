export function canMemberChange(task, memberId) {
  return task.assignee_id === null || memberId === task.assignee_id;
}
