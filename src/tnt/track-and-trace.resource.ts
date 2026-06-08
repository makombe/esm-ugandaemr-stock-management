import useSWR from 'swr';
import { restBaseUrl } from '@openmrs/esm-framework';
import tntEvents from './__mock__/tnt-events';

type TntEvent = {
  eventId: string;
  type: string;
  bizStep: string;
  status: string;
  reference: string;
  date: string;
};

export const useTntEvents = () => {
  const url = `${restBaseUrl}/tnt-events`;
  const { data, error, isLoading } = useSWR<{ data: { results: Array<TntEvent> } }>(
    url,
    (_: string) =>
      new Promise<{ data: { results: Array<TntEvent> } }>((resolve, _) => {
        setTimeout(() => resolve({ data: { results: tntEvents } }), 3000);
      }),
  );

  return {
    events: data?.data?.results ?? [],
    isLoading,
    error,
  };
};
