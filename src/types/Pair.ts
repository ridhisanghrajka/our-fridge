export interface Pair {
  id: string;              // 6-digit pairing code
  userAName: string;
  userBName: string;
  fridgeName?: string;
  createdAt: Date;
}
