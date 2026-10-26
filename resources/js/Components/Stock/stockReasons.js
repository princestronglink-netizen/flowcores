// resources/js/Components/Stock/stockReasons.js
// Keep these in sync with the constants in StockMovement.php
// (ADJUST_REASONS_IN, ADJUST_REASONS_OUT).

/** Adjust Stock page: reasons when ADDING stock. */
export const ADJUST_REASONS_IN = [
    { value: 'count_correction', label: 'Miscount', hint: 'The count was too low' },
    { value: 'received', label: 'Stock received', hint: 'Found or received but not recorded' },
    { value: 'other', label: 'Other', hint: 'Explain it in the note' },
];

/** Adjust Stock page: reasons when REMOVING stock. */
export const ADJUST_REASONS_OUT = [
    { value: 'count_correction', label: 'Miscount', hint: 'The count was too high' },
    { value: 'damaged', label: 'Damaged', hint: 'Broken, spoiled or unusable' },
    { value: 'defective', label: 'Defective', hint: 'Factory fault or failed check' },
    { value: 'expired', label: 'Expired', hint: 'Past its expiry date' },
    { value: 'lost', label: 'Lost / missing', hint: 'Could not be found after a check' },
    { value: 'internal', label: 'Internal use / sample', hint: 'Used by the team or given as a sample' },
    { value: 'other', label: 'Other', hint: 'Explain it in the note' },
];

const ALL = {
    received: 'Stock received',
    count_correction: 'Miscount',
    damaged: 'Damaged',
    defective: 'Defective',
    expired: 'Expired',
    lost: 'Lost / missing',
    internal: 'Internal use / sample',
    other: 'Other',
};

export const reasonLabel = (value) => ALL[value] ?? value;