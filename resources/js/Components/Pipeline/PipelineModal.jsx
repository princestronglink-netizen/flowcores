import { useEffect } from 'react';
import Modal from '@/Components/Modal';
import { Button } from '@/Components/ui/Button';
import { useForm } from '@inertiajs/react';
import {
    Workflow,
    Plus,
    Trash2,
    ChevronUp,
    ChevronDown,
    PackageMinus,
    FileText,
    ClipboardList,
} from 'lucide-react';

// Palette: slate #667292 · teal #8d9db6 · cream #bccad6 · deepEdge #3a4157 · mist #eef1f5

const slugify = (value) =>
    value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

let keyCounter = 0;
const emptyStage = () => ({
    _key: `new-${++keyCounter}`, // stable React key; stripped before submit
    id: null,
    stage_code: '',
    stage_name: '',
    stage_description: '',
    deducts_stock: false,
    creates_quotation: false,
    creates_client_po: false,
});

const emptyForm = () => ({
    pipeline_code: '',
    pipeline_name: '',
    pipeline_description: '',
    stages: [emptyStage()],
});

// Turning one flag on turns these other flags off on the same stage.
// The delivery stage can't also be a creation stage.
const EXCLUSIVE = {
    deducts_stock: ['creates_quotation', 'creates_client_po'],
    creates_quotation: ['deducts_stock'],
    creates_client_po: ['deducts_stock'],
};

// Each text already says that only one stage can be chosen.
const stageFlags = [
    {
        flag: 'deducts_stock',
        icon: PackageMinus,
        title: 'This is the delivery stage',
        text: 'Deliveries (full or partial) are recorded here and stock is deducted per delivery. A card stays here until everything is delivered. Returns are possible here and in later stages. Only one stage can be chosen.',
    },
    {
        flag: 'creates_quotation',
        icon: FileText,
        title: 'Quotation is auto-generated here',
        text: 'When a transaction enters this stage, a draft quotation is created from its client and items. Only one stage can be chosen.',
    },
    {
        flag: 'creates_client_po',
        icon: ClipboardList,
        title: 'Client purchase order is auto-generated here',
        text: "When a transaction enters this stage, a draft client PO is created from the accepted quotation. Confirming it sets the transaction's final items and amount. The card can't leave this stage until it is confirmed. Only one stage can be chosen.",
    },
];

const labelClass = 'block text-sm font-medium text-[#3a4157]';
const inputBase =
    'mt-1.5 block w-full rounded-md border bg-white px-3 py-2 text-sm text-[#3a4157] placeholder:text-[#8d9db6] transition focus:outline-none focus:ring-2';
const inputOk = 'border-[#bccad6] focus:border-[#667292] focus:ring-[#8d9db6]/40';
const inputBad = 'border-red-500 focus:border-red-500 focus:ring-red-200';
const inputClass = (hasError) => `${inputBase} ${hasError ? inputBad : inputOk}`;
const errorClass = 'mt-1 text-xs text-red-600';
const iconButton =
    'rounded p-1.5 text-[#667292] transition hover:bg-[#eef1f5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8d9db6] disabled:pointer-events-none disabled:opacity-30';

export default function PipelineModal({ show, onClose, pipeline }) {
    const isEditing = Boolean(pipeline);

    const { data, setData, post, put, processing, errors, clearErrors, reset, transform } = useForm(emptyForm());

    const stages = data.stages ?? [emptyStage()];

    useEffect(() => {
        if (show && pipeline) {
            setData({
                pipeline_code: pipeline.pipeline_code ?? '',
                pipeline_name: pipeline.pipeline_name ?? '',
                pipeline_description: pipeline.pipeline_description ?? '',
                stages:
                    pipeline.stages?.length > 0
                        ? [...pipeline.stages]
                              .sort((a, b) => a.sort_order - b.sort_order)
                              .map((s) => ({
                                  _key: `id-${s.id}`,
                                  id: s.id,
                                  stage_code: s.stage_code ?? '',
                                  stage_name: s.stage_name ?? '',
                                  stage_description: s.stage_description ?? '',
                                  deducts_stock: Boolean(s.deducts_stock),
                                  creates_quotation: Boolean(s.creates_quotation),
                                  creates_client_po: Boolean(s.creates_client_po),
                              }))
                        : [emptyStage()],
            });
        } else if (show && !pipeline) {
            reset();
            setData(emptyForm());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, pipeline]);

    const updateField = (field, value) => {
        if (field === 'pipeline_name' && !isEditing) {
            // new pipelines: keep the code in sync with the name until edited by hand
            setData((prev) => ({
                ...prev,
                pipeline_name: value,
                pipeline_code:
                    prev.pipeline_code === slugify(prev.pipeline_name) ? slugify(value) : prev.pipeline_code,
            }));
            clearErrors('pipeline_name', 'pipeline_code');
            return;
        }
        setData(field, value);
        if (value.trim() !== '') clearErrors(field);
    };

    const updateStage = (index, field, value) => {
        const updated = stages.map((stage, i) => {
            if (i !== index) return stage;
            const next = { ...stage, [field]: value };
            if (field === 'stage_name' && stage.stage_code === slugify(stage.stage_name)) {
                next.stage_code = slugify(value);
            }
            return next;
        });
        setData('stages', updated);
        if (typeof value === 'string' && value.trim() !== '') {
            clearErrors(`stages.${index}.${field}`);
        }
    };

    const addStage = () => setData('stages', [...stages, emptyStage()]);

    const removeStage = (index) =>
        setData(
            'stages',
            stages.filter((_, i) => i !== index)
        );

    const moveStage = (index, direction) => {
        const target = index + direction;
        if (target < 0 || target >= stages.length) return;
        const updated = [...stages];
        [updated[index], updated[target]] = [updated[target], updated[index]];
        setData('stages', updated);
    };

    // A flag lives on one stage only, and the delivery stage can't also be a creation stage.
    const setFlagStage = (index, flag, checked) =>
        setData(
            'stages',
            stages.map((stage, i) => {
                const next = { ...stage, [flag]: i === index ? checked : false };
                if (i === index && checked) EXCLUSIVE[flag].forEach((other) => (next[other] = false));
                return next;
            })
        );

    const submit = (e) => {
        e.preventDefault();

        // Strip the temporary React key before sending.
        transform((d) => ({
            ...d,
            stages: d.stages.map(({ _key, ...stage }) => stage),
        }));

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onClose();
            },
        };

        if (isEditing) {
            put(route('pipelines.update', pipeline.id), options);
        } else {
            post(route('pipelines.store'), options);
        }
    };

    const close = () => {
        reset();
        clearErrors();
        onClose();
    };

    return (
        <Modal show={show} onClose={close} maxWidth="3xl">
            <form onSubmit={submit} noValidate className="flex max-h-[88vh] flex-col">
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-[#bccad6]/60 px-6 py-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eef1f5]">
                        <Workflow className="h-5 w-5 text-[#667292]" />
                    </span>
                    <div className="min-w-0">
                        <h2 className="text-base font-semibold text-[#3a4157]">
                            {isEditing ? 'Edit pipeline' : 'New pipeline'}
                        </h2>
                        <p className="text-sm text-[#667292]">
                            Name the pipeline, then set the stages a card moves through.
                        </p>
                    </div>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 space-y-8 overflow-y-auto px-6 py-5">
                    <section className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor="pipeline_name" className={labelClass}>
                                    Pipeline name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="pipeline_name"
                                    type="text"
                                    placeholder="e.g. Procurement"
                                    value={data.pipeline_name}
                                    onChange={(e) => updateField('pipeline_name', e.target.value)}
                                    className={inputClass(errors.pipeline_name)}
                                />
                                {errors.pipeline_name && <p className={errorClass}>{errors.pipeline_name}</p>}
                            </div>

                            <div>
                                <label htmlFor="pipeline_code" className={labelClass}>
                                    Pipeline code <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="pipeline_code"
                                    type="text"
                                    placeholder="e.g. procurement"
                                    value={data.pipeline_code}
                                    onChange={(e) => updateField('pipeline_code', e.target.value)}
                                    readOnly={isEditing}
                                    className={`${inputClass(errors.pipeline_code)} ${
                                        isEditing ? 'cursor-not-allowed bg-[#eef1f5] text-[#667292]' : ''
                                    }`}
                                />
                                {isEditing && (
                                    <p className="mt-1 text-xs text-[#8d9db6]">The code can't change after creation.</p>
                                )}
                                {errors.pipeline_code && <p className={errorClass}>{errors.pipeline_code}</p>}
                            </div>
                        </div>

                        <div>
                            <label htmlFor="pipeline_description" className={labelClass}>
                                Description
                            </label>
                            <textarea
                                id="pipeline_description"
                                rows={2}
                                placeholder="What is this pipeline used for?"
                                value={data.pipeline_description}
                                onChange={(e) => updateField('pipeline_description', e.target.value)}
                                className={`${inputClass(errors.pipeline_description)} resize-none`}
                            />
                            {errors.pipeline_description && <p className={errorClass}>{errors.pipeline_description}</p>}
                        </div>
                    </section>

                    <section>
                        <div className="flex items-end justify-between gap-3">
                            <div>
                                <h3 className="text-sm font-semibold text-[#3a4157]">Stages</h3>
                                <p className="mt-0.5 text-xs text-[#667292]">
                                    Stages run top to bottom. Cards start in the first and finish in the last.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={addStage}
                                className="flex shrink-0 items-center gap-1 rounded-md border border-[#bccad6] px-2.5 py-1.5 text-xs font-medium text-[#667292] transition hover:bg-[#eef1f5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8d9db6]"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Add stage
                            </button>
                        </div>

                        {typeof errors.stages === 'string' && <p className={errorClass}>{errors.stages}</p>}

                        <ol className="relative mt-4 space-y-3 before:absolute before:bottom-6 before:left-[13px] before:top-6 before:w-px before:bg-[#bccad6]">
                            {stages.map((stage, index) => {
                                const codeError = errors[`stages.${index}.stage_code`];
                                const nameError = errors[`stages.${index}.stage_name`];
                                const descError = errors[`stages.${index}.stage_description`];
                                const isFirst = index === 0;
                                const isLast = index === stages.length - 1;

                                return (
                                    <li key={stage._key} className="relative pl-10">
                                        <span className="absolute left-0 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-[#667292] text-xs font-semibold text-white ring-4 ring-white">
                                            {index + 1}
                                        </span>

                                        <div className="rounded-lg border border-[#bccad6] bg-white p-4">
                                            <div className="mb-3 flex items-center justify-between">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {isFirst && (
                                                        <span className="rounded-full bg-[#eef1f5] px-2 py-0.5 text-xs font-medium text-[#667292]">
                                                            Start
                                                        </span>
                                                    )}
                                                    {isLast && stages.length > 1 && (
                                                        <span className="rounded-full bg-[#eef1f5] px-2 py-0.5 text-xs font-medium text-[#667292]">
                                                            Final
                                                        </span>
                                                    )}
                                                    {stage.deducts_stock && (
                                                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                                                            Delivery
                                                        </span>
                                                    )}
                                                    {stage.creates_quotation && (
                                                        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
                                                            Quotations
                                                        </span>
                                                    )}
                                                    {stage.creates_client_po && (
                                                        <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700">
                                                            Client PO
                                                        </span>
                                                    )}
                                                    {!isFirst &&
                                                        !(isLast && stages.length > 1) &&
                                                        !stage.deducts_stock &&
                                                        !stage.creates_quotation &&
                                                        !stage.creates_client_po && (
                                                            <span className="text-xs text-[#8d9db6]">Stage {index + 1}</span>
                                                        )}
                                                </div>

                                                <div className="flex items-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => moveStage(index, -1)}
                                                        disabled={isFirst}
                                                        className={iconButton}
                                                        aria-label="Move stage up"
                                                    >
                                                        <ChevronUp className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => moveStage(index, 1)}
                                                        disabled={isLast}
                                                        className={iconButton}
                                                        aria-label="Move stage down"
                                                    >
                                                        <ChevronDown className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeStage(index)}
                                                        disabled={stages.length === 1}
                                                        className={`${iconButton} hover:!bg-red-50 hover:!text-red-600`}
                                                        aria-label="Remove stage"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                <div>
                                                    <label htmlFor={`stage_name_${index}`} className={labelClass}>
                                                        Name <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        id={`stage_name_${index}`}
                                                        type="text"
                                                        placeholder="e.g. Delivery"
                                                        value={stage.stage_name}
                                                        onChange={(e) => updateStage(index, 'stage_name', e.target.value)}
                                                        className={inputClass(nameError)}
                                                    />
                                                    {nameError && <p className={errorClass}>{nameError}</p>}
                                                </div>

                                                <div>
                                                    <label htmlFor={`stage_code_${index}`} className={labelClass}>
                                                        Code <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        id={`stage_code_${index}`}
                                                        type="text"
                                                        placeholder="e.g. delivery"
                                                        value={stage.stage_code}
                                                        onChange={(e) => updateStage(index, 'stage_code', e.target.value)}
                                                        className={inputClass(codeError)}
                                                    />
                                                    {codeError && <p className={errorClass}>{codeError}</p>}
                                                </div>
                                            </div>

                                            <div className="mt-3">
                                                <label htmlFor={`stage_description_${index}`} className={labelClass}>
                                                    Description
                                                </label>
                                                <input
                                                    id={`stage_description_${index}`}
                                                    type="text"
                                                    placeholder="Optional"
                                                    value={stage.stage_description}
                                                    onChange={(e) => updateStage(index, 'stage_description', e.target.value)}
                                                    className={inputClass(descError)}
                                                />
                                                {descError && <p className={errorClass}>{descError}</p>}
                                            </div>

                                            {stageFlags.map(({ flag, icon: Icon, title, text }) => (
                                                <label
                                                    key={flag}
                                                    className={`mt-3 flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 transition ${
                                                        stage[flag]
                                                            ? 'border-[#667292] bg-[#eef1f5]'
                                                            : 'border-[#bccad6] hover:bg-[#eef1f5]/60'
                                                    }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={stage[flag]}
                                                        onChange={(e) => setFlagStage(index, flag, e.target.checked)}
                                                        className="mt-0.5 h-4 w-4 rounded border-[#bccad6] accent-[#667292]"
                                                    />
                                                    <span className="min-w-0">
                                                        <span className="flex items-center gap-1.5 text-sm font-medium text-[#3a4157]">
                                                            <Icon className="h-4 w-4 text-[#667292]" />
                                                            {title}
                                                        </span>
                                                        <span className="mt-0.5 block text-xs text-[#667292]">{text}</span>
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </li>
                                );
                            })}
                        </ol>
                    </section>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 border-t border-[#bccad6]/60 bg-[#eef1f5]/50 px-6 py-3">
                    <p className="text-xs text-[#667292]">
                        {stages.length} {stages.length === 1 ? 'stage' : 'stages'}
                    </p>
                    <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={close}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="brand" disabled={processing}>
                            {processing ? 'Saving…' : isEditing ? 'Save changes' : 'Create pipeline'}
                        </Button>
                    </div>
                </div>
            </form>
        </Modal>
    );
}