export interface Pair {
  id: string;              // 6-digit pairing code
  memberUids: string[];
  memberNames: { [uid: string]: string };
  memberPhotos?: { [uid: string]: string };
  fridgeName: string;
  isPremiumEnabled: boolean;
  createdAt: Date;
}
