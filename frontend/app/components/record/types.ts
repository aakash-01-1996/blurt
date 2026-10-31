/** View-model types local to the Record page. */

export interface RecMeta {
  pending: number;
  kept: number;
  firstSpan: string | null;
  sections: Record<string, number>;
}

export interface WeekStats {
  streak: number;
  totalKept: number;
  workLog: number;
  tasks: number;
  lists: number;
}
