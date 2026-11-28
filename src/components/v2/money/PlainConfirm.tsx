import { ConfirmAction } from '@/components/ConfirmAction';
import type { MoneyConfirmProps } from './MoneyConfirm';

/** Today's ConfirmAction, ignoring the v2 hints: what the money views use with the gate off. */
export function PlainConfirm({ v2: _v2, ...rest }: MoneyConfirmProps) {
  return <ConfirmAction {...rest} />;
}
