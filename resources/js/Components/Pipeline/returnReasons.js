// Keep in sync with Delivery::RETURN_REASONS in PHP.
export const RETURN_REASONS = [
    { value: 'damaged', label: 'Damaged' },
    { value: 'defective', label: 'Defective' },
    { value: 'expired', label: 'Expired' },
    { value: 'lost', label: 'Lost / missing' },
    { value: 'other', label: 'Other' },
];

export const reasonLabel = (value) => RETURN_REASONS.find((r) => r.value === value)?.label ?? value;
