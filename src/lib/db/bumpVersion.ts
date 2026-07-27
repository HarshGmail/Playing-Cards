import { ObjectId } from 'mongodb';
import { getMatches } from './collections';

export async function bumpMatchVersion(matchId: string): Promise<number> {
  const matches = await getMatches();
  const result = await matches.findOneAndUpdate(
    { _id: new ObjectId(matchId) },
    { $inc: { version: 1 } },
    { returnDocument: 'after' }
  );

  if (!result) throw new Error('Match not found');
  return result.version;
}
