import { Button, CodeSnippet, ModalBody, ModalFooter, ModalHeader } from '@carbon/react';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { type TntEvent } from '../track-and-trace.resource';
type TntMessageViewProps = {
  event: TntEvent;
  onClose: () => void;
};
const TntMessageView: React.FC<TntMessageViewProps> = ({ event, onClose }) => {
  const { t } = useTranslation();
  const jsonMessage = useMemo(() => {
    try {
      if (!event.message) return {};
      const json = JSON.parse(event.message);
      return json;
    } catch (error) {
      return {};
    }
  }, [event]);
  return (
    <React.Fragment>
      <ModalHeader closeModal={onClose} title={t('tntMessage', 'Tnt Message')} />
      <ModalBody>
        <CodeSnippet type="multi" feedback={t('copiedToClipBoard', 'Copied to clipboard!')}>
          {JSON.stringify(jsonMessage, null, 2)}
        </CodeSnippet>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose}>
          {t('close', 'Close')}
        </Button>
      </ModalFooter>
    </React.Fragment>
  );
};

export default TntMessageView;
