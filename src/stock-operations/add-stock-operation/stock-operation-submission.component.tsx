import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StockOperationDTO } from '../../core/api/types/stockOperation/StockOperationDTO';
import { SaveStockOperation, SaveStockOperationAction } from '../../stock-items/types';
import { StockOperationType } from '../../core/api/types/stockOperation/StockOperationType';
import { InitializeResult } from './types';
import { Button, InlineLoading, RadioButton, RadioButtonGroup, TextInput } from '@carbon/react';
import { Departure, ListChecked, Save, SendFilled, Undo } from '@carbon/react/icons';

interface StockOperationSubmissionProps {
  isEditing?: boolean;
  model?: StockOperationDTO;
  onSave?: SaveStockOperation;
  operation: StockOperationType;
  setup: InitializeResult;
  canEdit?: boolean;
  locked?: boolean;
  requiresDispatchAcknowledgement?: boolean;
  actions: {
    onGoBack: () => void;
    onSave?: SaveStockOperation;
    onComplete: SaveStockOperationAction;
    onSubmit: SaveStockOperationAction;
    onDispatch: SaveStockOperationAction;
  };
}

const StockOperationSubmission: React.FC<StockOperationSubmissionProps> = ({
  canEdit,
  locked,
  model,
  requiresDispatchAcknowledgement,
  actions,
  isEditing,
}) => {
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);
  const [approvalRequired, setApprovalRequired] = useState<boolean | null>(model?.approvalRequired);

  const handleRadioButtonChange = (selectedItem: boolean) => {
    setApprovalRequired(selectedItem);
  };

  return (
    <div style={{ margin: '10px' }}>
      {canEdit && !locked && (
        <div style={{ margin: '10px' }}>
          <RadioButtonGroup
            name="rbgApprovelRequired"
            legendText={t('doesThisTransactionRequireApproval', 'Does the transaction require approval ?')}
            onChange={handleRadioButtonChange}
          >
            <RadioButton value={true} id="rbgApprovelRequired-true" labelText={t('yes', 'Yes')} />
            <RadioButton value={false} id="rbgApprovelRequired-false" labelText={t('no', 'No')} />
          </RadioButtonGroup>
        </div>
      )}
      {!canEdit && (
        <>
          <TextInput
            style={{ margin: '5px' }}
            id="rbgApproveRequiredLbl"
            value={approvalRequired ? t('yes', 'Yes') : t('no', 'No')}
            readOnly={true}
            labelText={t('doesThisTransactionRequireApproval', 'Does the transaction require approval ?')}
          />
        </>
      )}

      {canEdit && !locked && (
        <div className="stkpg-form-buttons" style={{ margin: '10px' }}>
          {approvalRequired != null && (
            <>
              {!requiresDispatchAcknowledgement && !approvalRequired && (
                <Button
                  name="complete"
                  type="button"
                  style={{ margin: '4px' }}
                  className="submitButton"
                  kind="primary"
                  onClick={async () => {
                    delete model?.dateCreated;
                    setIsSaving(true);
                    if (!isEditing) {
                      delete model.status;
                      await actions.onSave(model);
                      setIsSaving(false);
                    }
                    model.status = 'COMPLETED';
                    actions.onComplete(model);
                    setIsSaving(false);
                  }}
                  renderIcon={ListChecked}
                >
                  {t('complete', 'Complete')}
                </Button>
              )}
              {requiresDispatchAcknowledgement && !approvalRequired && (
                <Button
                  name="dispatch"
                  type="button"
                  style={{ margin: '4px' }}
                  className="submitButton"
                  kind="primary"
                  onClick={async () => {
                    delete model?.dateCreated;
                    delete model?.status;
                    setIsSaving(true);
                    await actions.onSave(model).then(() => {
                      model.status = 'DISPATCHED';
                      actions.onDispatch(model);
                      setIsSaving(false);
                    });
                  }}
                  renderIcon={Departure}
                >
                  {isSaving ? (
                    <InlineLoading description={t('dispatching', 'Dispatching')} />
                  ) : (
                    t('dispatch', 'Dispatch')
                  )}
                </Button>
              )}
              {approvalRequired && (
                <Button
                  name="submit"
                  type="button"
                  style={{ margin: '4px' }}
                  className="submitButton"
                  kind="primary"
                  onClick={async () => {
                    delete model?.dateCreated;
                    delete model?.status;
                    setIsSaving(true);
                    await actions.onSave(model).then(() => {
                      model.status = 'SUBMITTED';
                      actions.onSubmit(model);
                      setIsSaving(false);
                    });
                  }}
                  renderIcon={SendFilled}
                >
                  {isSaving ? (
                    <InlineLoading description={t('submittingForReview', 'Submitting for review')} />
                  ) : (
                    t('submitForReview', 'Submit For Review')
                  )}
                </Button>
              )}
            </>
          )}
          <Button
            name="save"
            type="button"
            className="submitButton"
            style={{ margin: '4px' }}
            disabled={isSaving}
            onClick={async () => {
              delete model?.dateCreated;
              delete model?.status;
              setIsSaving(true);
              model.approvalRequired = approvalRequired ? true : false;
              await actions.onSave(model);
              setIsSaving(false);
            }}
            kind="secondary"
            renderIcon={Save}
          >
            {isSaving ? <InlineLoading /> : t('save', 'Save')}
          </Button>
          {!isSaving && (
            <Button
              type="button"
              style={{ margin: '4px' }}
              className="cancelButton"
              kind="tertiary"
              onClick={actions.onGoBack}
              renderIcon={Undo}
            >
              {t('goBack', 'Go Back')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default StockOperationSubmission;
