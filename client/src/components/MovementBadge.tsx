import { Badge } from './ui';
import { IconArrowDown, IconArrowUp } from './icons';
import type { Movement } from '../lib/api';

const LABEL: Record<Movement['movement_type'], string> = {
  PURCHASE_RECEIPT: 'Purchase receipt',
  SALE: 'Sale',
  ADJUSTMENT: 'Adjustment',
  RETURN: 'Return',
};

const TONE: Record<Movement['movement_type'], 'green' | 'red' | 'amber' | 'violet'> = {
  PURCHASE_RECEIPT: 'green',
  SALE: 'red',
  ADJUSTMENT: 'amber',
  RETURN: 'violet',
};

export function MovementTypeBadge({ type }: { type: Movement['movement_type'] }) {
  return <Badge tone={TONE[type]}>{LABEL[type]}</Badge>;
}

/** Signed quantity, e.g. "+12" green / "-3" red, based on direction. */
export function QtyDelta({ direction, quantity, uom }: {
  direction: 'IN' | 'OUT'; quantity: number; uom?: string;
}) {
  const isIn = direction === 'IN';
  return (
    <span className={`inline-flex items-center gap-1 font-semibold tabular-nums
      ${isIn ? 'text-emerald-600' : 'text-rose-600'}`}>
      {isIn ? <IconArrowUp className="w-3.5 h-3.5" /> : <IconArrowDown className="w-3.5 h-3.5" />}
      {isIn ? '+' : '−'}{quantity}{uom ? <span className="text-slate-400 font-normal">{uom}</span> : null}
    </span>
  );
}
