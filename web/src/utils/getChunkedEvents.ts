import type { Contract, EventLog } from 'ethers';

export async function getChunkedEvents(
  contract: Contract,
  filter: any,
  fromBlock: number,
  chunkSize = 5000
): Promise<EventLog[]> {
  const provider = contract.runner?.provider;
  if (!provider) {
    throw new Error('El contrato no tiene un provider asociado');
  }

  const latest = await provider.getBlockNumber();
  const events: EventLog[] = [];

  for (let start = fromBlock; start <= latest; start += chunkSize) {
    const end = Math.min(start + chunkSize - 1, latest);
    const chunk = (await contract.queryFilter(filter, start, end)) as EventLog[];
    events.push(...chunk);
  }

  return events;
}
