import { useEffect } from 'react';
import Modal from '@/Components/Modal';
import { Button } from '@/Components/ui/Button';
import { useForm } from '@inertiajs/react';
import {
    Workflow,
    Hash,
    FileText,
    Layers,
    Plus,
    Trash2,
    ChevronUp,
    ChevronDown,
} from 'lucide-react';

const PALETTE = {
    slate: '#667292',
    teal: '#8d9db6',
    cream: '#bccad6',
    deepEdge: '#3a4157',
    mist: '#eef1f5',
};

const slugify = (value) =>
    value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

const emptyStage = () => ({
    id: null,
    stage_code: '',
    stage_name: '',
    stage_description: '',
});

const emptyForm = () => ({
    pipeline_code: '',
    pipeline_name: '',
    pipeline_description: '',
    stages: [emptyStage()],
});

export default function PipelineModal({ show, onClose, pipeline }) {
    const isEditing = Boolean(pipeline);

    const { data, setData, post, put, processing, errors, clearErrors, reset } = useForm(emptyForm());

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
                                  id: s.id,
                                  stage_code: s.stage_code ?? '',
                                  stage_name: s.stage_name ?? '',
                                  stage_description: s.stage_description ?? '',
                              }))
                        : [emptyStage()],
            });
        } else if (show && !pipeline) {
            reset();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, pipeline]);

    const updateField = (field, value) => {
        setData(field, value);
        if (value.trim() !== '') {
            clearErrors(field);
        }
    };

    const updateStage = (index, field, value) => {
        const updated = stages.map((stage, i) => {
            if (i !== index) return stage;

            const next = { ...stage, [field]: value };

            // keep the code in sync with the name until the user edits the code by hand
            if (field === 'stage_name' && stage.stage_code === slugify(stage.stage_name)) {
                next.stage_code = slugify(value);
            }
            return next;
        });

        setData('stages', updated);
        if (value.trim() !== '') {
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

    const submit = (e) => {
        e.preventDefault();

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

    const inputStyle = { borderColor: PALETTE.cream, color: PALETTE.deepEdge };
    const errorInputStyle = { borderColor: '#dc2626', color: PALETTE.deepEdge };
    const labelStyle = { color: PALETTE.slate };
    const labelClass = 'flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide';
    const fieldClass =
        'mt-1 block w-full rounded-md border px-3 py-2 text-sm transition-shadow focus:outline-none focus:ring-2';
    const errorClass = 'mt-1 text-xs text-red-600';
    const iconButtonClass = 'rounded p-1 disabled:opacity-30';

    return (
        <Modal show={show} onClose={close} maxWidth="3xl">
            <form onSubmit={submit} noValidate className="p-6">
                <div className="flex items-center gap-3">
                    <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: PALETTE.mist }}
                    >
                        <Workflow className="h-4 w-4" style={{ color: PALETTE.slate }} />
                    </span>
                    <div>
                        <h2 className="text-base font-semibold" style={{ color: PALETTE.deepEdge }}>
                            {isEditing ? 'Edit Pipeline' : 'New Pipeline'}
                        </h2>
                        <p className="text-sm" style={{ color: PALETTE.slate }}>
                            Define the pipeline and the stages a transaction moves through.
                        </p>
                    </div>
                </div>

                <div className="mt-6 space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="pipeline_code" className={labelClass} style={labelStyle}>
                                <Hash className="h-3.5 w-3.5" />
                                Pipeline Code <span>*</span>
                            </label>
                            <input
                                id="pipeline_code"
                                type="text"
                                placeholder="e.g. PROC-001"
                                value={data.pipeline_code}
                                onChange={(e) => updateField('pipeline_code', e.target.value)}
                                className={fieldClass}
                                style={errors.pipeline_code ? errorInputStyle : inputStyle}
                            />
                            {errors.pipeline_code && <p className={errorClass}>{errors.pipeline_code}</p>}
                        </div>

                        <div>
                            <label htmlFor="pipeline_name" className={labelClass} style={labelStyle}>
                                <Workflow className="h-3.5 w-3.5" />
                                Pipeline Name <span>*</span>
                            </label>
                            <input
                                id="pipeline_name"
                                type="text"
                                placeholder="e.g. Procurement"
                                value={data.pipeline_name}
                                onChange={(e) => updateField('pipeline_name', e.target.value)}
                                className={fieldClass}
                                style={errors.pipeline_name ? errorInputStyle : inputStyle}
                            />
                            {errors.pipeline_name && <p className={errorClass}>{errors.pipeline_name}</p>}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="pipeline_description" className={labelClass} style={labelStyle}>
                            <FileText className="h-3.5 w-3.5" />
                            Description
                        </label>
                        <textarea
                            id="pipeline_description"
                            rows={3}
                            placeholder="What is this pipeline used for?"
                            value={data.pipeline_description}
                            onChange={(e) => updateField('pipeline_description', e.target.value)}
                            className={fieldClass}
                            style={errors.pipeline_description ? errorInputStyle : inputStyle}
                        />
                        {errors.pipeline_description && (
                            <p className={errorClass}>{errors.pipeline_description}</p>
                        )}
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className={labelClass} style={labelStyle}>
                                <Layers className="h-3.5 w-3.5" />
                                Stages
                            </span>
                            <button
                                type="button"
                                onClick={addStage}
                                className="flex items-center gap-1 text-xs font-semibold"
                                style={{ color: PALETTE.slate }}
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Add Stage
                            </button>
                        </div>

                        <p className="text-xs" style={{ color: PALETTE.teal }}>
                            Stages run in the order listed. The first is where new transactions start; the last
                            completes the pipeline.
                        </p>

                        {typeof errors.stages === 'string' && <p className={errorClass}>{errors.stages}</p>}

                        {stages.map((stage, index) => {
                            const codeError = errors[`stages.${index}.stage_code`];
                            const nameError = errors[`stages.${index}.stage_name`];
                            const descError = errors[`stages.${index}.stage_description`];
                            const isFirst = index === 0;
                            const isLast = index === stages.length - 1;

                            return (
                                <div
                                    key={stage.id ?? `new-${index}`}
                                    className="rounded-md border p-3"
                                    style={{ borderColor: PALETTE.cream }}
                                >
                                    <div className="mb-2 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold"
                                                style={{ backgroundColor: PALETTE.mist, color: PALETTE.slate }}
                                            >
                                                {index + 1}
                                            </span>
                                            {isFirst && (
                                                <span className="text-xs font-medium" style={{ color: PALETTE.teal }}>
                                                    Start
                                                </span>
                                            )}
                                            {isLast && stages.length > 1 && (
                                                <span className="text-xs font-medium" style={{ color: PALETTE.teal }}>
                                                    Final
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center" style={{ color: PALETTE.slate }}>
                                            <button
                                                type="button"
                                                onClick={() => moveStage(index, -1)}
                                                disabled={isFirst}
                                                className={iconButtonClass}
                                                aria-label="Move stage up"
                                            >
                                                <ChevronUp className="h-4 w-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => moveStage(index, 1)}
                                                disabled={isLast}
                                                className={iconButtonClass}
                                                aria-label="Move stage down"
                                            >
                                                <ChevronDown className="h-4 w-4" />
                                            </button>
                                            {stages.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeStage(index)}
                                                    className={iconButtonClass}
                                                    aria-label="Remove stage"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div>
                                            <label htmlFor={`stage_name_${index}`} className={labelClass} style={labelStyle}>
                                                Name <span>*</span>
                                            </label>
                                            <input
                                                id={`stage_name_${index}`}
                                                type="text"
                                                placeholder="e.g. Negotiation"
                                                value={stage.stage_name}
                                                onChange={(e) => updateStage(index, 'stage_name', e.target.value)}
                                                className={fieldClass}
                                                style={nameError ? errorInputStyle : inputStyle}
                                            />
                                            {nameError && <p className={errorClass}>{nameError}</p>}
                                        </div>

                                        <div>
                                            <label htmlFor={`stage_code_${index}`} className={labelClass} style={labelStyle}>
                                                Code <span>*</span>
                                            </label>
                                            <input
                                                id={`stage_code_${index}`}
                                                type="text"
                                                placeholder="e.g. negotiation"
                                                value={stage.stage_code}
                                                onChange={(e) => updateStage(index, 'stage_code', e.target.value)}
                                                className={fieldClass}
                                                style={codeError ? errorInputStyle : inputStyle}
                                            />
                                            {codeError && <p className={errorClass}>{codeError}</p>}
                                        </div>
                                    </div>

                                    <div className="mt-3">
                                        <label htmlFor={`stage_description_${index}`} className={labelClass} style={labelStyle}>
                                            Description
                                        </label>
                                        <input
                                            id={`stage_description_${index}`}
                                            type="text"
                                            placeholder="Optional"
                                            value={stage.stage_description}
                                            onChange={(e) => updateStage(index, 'stage_description', e.target.value)}
                                            className={fieldClass}
                                            style={descError ? errorInputStyle : inputStyle}
                                        />
                                        {descError && <p className={errorClass}>{descError}</p>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-2 border-t pt-4" style={{ borderColor: PALETTE.cream }}>
                    <Button type="button" variant="outline" onClick={close}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="brand" disabled={processing}>
                        {isEditing ? 'Update' : 'Save'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}