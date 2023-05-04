export const enum AsstMsg {
  /* Global Info */
  InternalError = 0, // 内部错误
  InitFailed, // 初始化失败
  ConnectionInfo, // 连接相关信息

  AllTasksCompleted, // 全部任务完成
  AsyncCallInfo, // 外部异步调用信息

  /* TaskChain Info */
  TaskChainError = 10000, // 任务链执行/识别错误
  TaskChainStart, // 任务链开始
  TaskChainCompleted, // 任务链完成
  TaskChainExtraInfo, // 任务链额外信息
  TaskChainStopped, // 任务链手动停止

  /* SubTask Info */
  SubTaskError = 20000, // 原子任务执行/识别错误
  SubTaskStart, // 原子任务开始
  SubTaskCompleted, // 原子任务完成
  SubTaskExtraInfo, // 原子任务额外信息
  SubTaskStopped, // 原子任务手动停止
}

export const enum InstanceOptionKey {
  Invalid = 0,
  // 已弃用 // MinitouchEnabled = 1,   // 是否启用 minitouch
  // 开了也不代表就一定能用，有可能设备不支持等
  // "1" 开，"0" 关
  TouchMode = 2, // 触控模式设置，默认 minitouch
  // minitouch | maatouch | adb
  DeploymentWithPause = 3, // 是否暂停下干员，同时影响抄作业、肉鸽、保全
  // "1" | "0"
}
