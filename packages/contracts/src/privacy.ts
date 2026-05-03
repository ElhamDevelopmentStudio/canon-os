export type PersonalDataCounts = Record<string, number>;

export type PersonalDataSummary = {
  counts: PersonalDataCounts;
  totalRecords: number;
};

export type DataDeletionResult = {
  deletedCounts: PersonalDataCounts;
  totalDeleted: number;
  message: string;
};

export type AccountDeletionResult = {
  deleted: boolean;
  message: string;
};
