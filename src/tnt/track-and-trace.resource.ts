import useSWR from 'swr';
import { type FetchResponse, openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

export type TntEvent = {
  uuid: string;
  eventId: string;
  eventType: string;
  bizType?: string;
  status: string;
  reference: string;
  eventTime?: string;
  message?: string;
  retired: number;
  dateCreated: string;
  dateUpdated: string;
};

export const useTntEvents = () => {
  const url = `${restBaseUrl}/stockmanagement/trackandtraceevent`;
  const { data, error, isLoading } = useSWR<FetchResponse<{ results: Array<TntEvent> }>>(url, openmrsFetch);

  return {
    events: data?.data?.results ?? [],
    isLoading,
    error,
  };
};
