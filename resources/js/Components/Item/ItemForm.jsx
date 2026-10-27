import { useMemo, useState } from 'react';
import axios from 'axios';
import { Link, useForm } from '@inertiajs/react';
import { Button } from '@/Components/ui/Button';
import SearchSelect from '@/Components/ui/SearchSelect';
import { ArrowLeft, Package, Plus, Tags, Trash2 } from 'lucide-react';
import {
    Banner,
    Field,
    IconButton,
    LinkButton,
    Panel,
    SummaryLine,
    cx,
    input,
    inputCls,
} from '@/Components/ui/kit';

const emptyVariant = () => ({ id: null, unit_of_measure: 'pcs', size: '', stock: 0 });
const emptyBrand = () => ({ id: null, brand_name: '', variants: [emptyVariant()] });

const variantGrid = 'sm:grid-cols-[repeat(3,minmax(0,1fr))_32px]';
const mobileLabel = 'mb-1 block text-xs font-medium text-slate-500 sm:hidden';

export default function ItemForm({ item = null, categories = [] }) {
    const isEditing = Boolean(item);

    const initialData = item
        ? {
              item_category_id: item.item_category_id ?? '',
              item_name: item.item_name ?? '',
              description: item.description ?? '',
              brands:
                  item.brands?.length > 0
                      ? item.brands.map((b) => ({
                            id: b.id,
                            brand_name: b.brand_name ?? '',
                            variants:
                                b.variants?.length > 0
                                    ? b.variants.map((v) => ({
                                          id: v.id,
                                          unit_of_measure: v.unit_of_measure ?? 'pcs',
                                          size: v.size ?? '',
                                          stock: v.stock ?? 0,
                                          moq: v.moq ?? 0, // display only: total ordered in the last 30 days, computed by the server
                                      }))
                                    : [emptyVariant()],
                        }))
                      : [emptyBrand()],
          }
        : { item_category_id: '', item_name: '', description: '', brands: [emptyBrand()] };

    const { data, setData, post, put, processing, errors, clearErrors } = useForm(initialData);

    const [categoryList, setCategoryList] = useState(categories);
    const [newCategoryName, setNewCategoryName] = useState(null); // null = closed
    const [categoryError, setCategoryError] = useState('');

    const categoryOptions = useMemo(
        () => [
            { value: '', label: 'Uncategorized' },
            ...categoryList.map((c) => ({ value: c.id, label: c.category_name })),
        ],
        [categoryList],
    );

    const addCategory = async () => {
        setCategoryError('');
        try {
            const res = await axios.post(route('categories.quickStore'), { category_name: newCategoryName });
            setCategoryList((prev) => [...prev, res.data].sort((a, b) => a.category_name.localeCompare(b.category_name)));
            setData('item_category_id', res.data.id);
            setNewCategoryName(null);
        } catch (err) {
            setCategoryError(err.response?.data?.errors?.category_name?.[0] ?? 'Could not add the category.');
        }
    };

    const brands = data.brands;
    const totals = useMemo(() => {
        const variants = brands.flatMap((b) => b.variants);
        return { variantCount: variants.length, stock: variants.reduce((s, v) => s + (Number(v.stock) || 0), 0) };
    }, [brands]);

    // ---- helpers ----
    const updateField = (field, value) => {
        setData(field, value);
        if (String(value).trim() !== '') clearErrors(field);
    };

    const updateBrand = (b, field, value) => {
        setData('brands', brands.map((x, i) => (i === b ? { ...x, [field]: value } : x)));
        if (String(value).trim() !== '') clearErrors(`brands.${b}.${field}`);
    };
    const addBrand = () => setData('brands', [...brands, emptyBrand()]);
    const removeBrand = (b) => setData('brands', brands.filter((_, i) => i !== b));

    const updateVariant = (b, v, field, value) => {
        setData(
            'brands',
            brands.map((x, i) =>
                i !== b ? x : { ...x, variants: x.variants.map((y, j) => (j === v ? { ...y, [field]: value } : y)) },
            ),
        );
        if (String(value).trim() !== '') clearErrors(`brands.${b}.variants.${v}.${field}`);
    };
    const addVariant = (b) =>
        setData('brands', brands.map((x, i) => (i === b ? { ...x, variants: [...x.variants, emptyVariant()] } : x)));
    const removeVariant = (b, v) =>
        setData('brands', brands.map((x, i) => (i === b ? { ...x, variants: x.variants.filter((_, j) => j !== v) } : x)));

    const submit = (e) => {
        e.preventDefault();
        if (isEditing) put(route('items.update', item.id));
        else post(route('items.store'));
    };

    const hasErrors = Object.keys(errors ?? {}).length > 0;
    const listUrl = route('items.index');

    return (
        <>
            <form onSubmit={submit} noValidate className="mx-auto w-full max-w-[1680px] p-4 sm:p-6">
                <Link href={listUrl} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900">
                    <ArrowLeft className="h-4 w-4" />
                    Items
                </Link>

                <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="min-w-0 space-y-5">
                        <Panel title="Item details" description="What is it, and where does it belong?" icon={Package}>
                            <div className="grid gap-4 md:grid-cols-3">
                                <Field label="Item name" required htmlFor="item_name" error={errors.item_name}>
                                    <input
                                        id="item_name"
                                        type="text"
                                        placeholder="e.g. Paint"
                                        value={data.item_name}
                                        onChange={(e) => updateField('item_name', e.target.value)}
                                        className={input(errors.item_name)}
                                    />
                                </Field>

                                <div>
                                    <Field
                                        label="Category"
                                        htmlFor="item_category_id"
                                        error={categoryError || errors.item_category_id}
                                        action={
                                            <LinkButton icon={Plus} onClick={() => setNewCategoryName((v) => (v === null ? '' : null))}>
                                                New
                                            </LinkButton>
                                        }
                                    >
                                        <SearchSelect
                                            id="item_category_id"
                                            ariaLabel="Category"
                                            placeholder="Uncategorized"
                                            searchPlaceholder="Type a category"
                                            emptyText="No categories found"
                                            options={categoryOptions}
                                            value={data.item_category_id}
                                            onChange={(v) => updateField('item_category_id', v)}
                                            inputClassName={input(errors.item_category_id)}
                                        />
                                    </Field>
                                    {newCategoryName !== null && (
                                        <div className="mt-2 flex gap-2">
                                            <input
                                                type="text"
                                                autoFocus
                                                placeholder="Category name"
                                                value={newCategoryName}
                                                onChange={(e) => setNewCategoryName(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        addCategory();
                                                    }
                                                }}
                                                className={inputCls}
                                            />
                                            <Button type="button" variant="brand" onClick={addCategory}>Add</Button>
                                        </div>
                                    )}
                                </div>

                                <Field label="Description" htmlFor="description" error={errors.description}>
                                    <input
                                        id="description"
                                        type="text"
                                        placeholder="Optional"
                                        value={data.description}
                                        onChange={(e) => updateField('description', e.target.value)}
                                        className={input(errors.description)}
                                    />
                                </Field>
                            </div>
                        </Panel>

                        {typeof errors.brands === 'string' && <Banner tone="error">{errors.brands}</Banner>}

                        {brands.map((brand, b) => {
                            const brandError = errors[`brands.${b}.brand_name`];
                            return (
                                <section key={brand.id ?? `brand-${b}`} className="rounded-xl border border-slate-200 bg-white shadow-sm">
                                    <header className="flex items-end gap-3 border-b border-slate-100 px-5 py-4">
                                        <Field
                                            className="max-w-sm flex-1"
                                            label={brands.length > 1 ? `Brand ${b + 1}` : 'Brand'}
                                            required
                                            htmlFor={`brand_name_${b}`}
                                            error={brandError}
                                        >
                                            <input
                                                id={`brand_name_${b}`}
                                                type="text"
                                                placeholder="e.g. Boysen"
                                                value={brand.brand_name}
                                                onChange={(e) => updateBrand(b, 'brand_name', e.target.value)}
                                                className={input(brandError)}
                                            />
                                        </Field>
                                        <div className="ml-auto flex items-center gap-1 pb-0.5">
                                            <Button type="button" variant="outline" onClick={() => addVariant(b)}>
                                                <Plus />
                                                Add variant
                                            </Button>
                                            {brands.length > 1 && (
                                                <IconButton icon={Trash2} label="Remove brand" danger onClick={() => removeBrand(b)} />
                                            )}
                                        </div>
                                    </header>

                                    {typeof errors[`brands.${b}.variants`] === 'string' && (
                                        <p className="px-5 pt-3 text-xs text-red-600">{errors[`brands.${b}.variants`]}</p>
                                    )}

                                    <div className={cx('hidden gap-3 border-b border-slate-100 bg-slate-50 px-5 py-2 text-xs font-medium text-slate-500 sm:grid', variantGrid)}>
                                        <span>Unit</span>
                                        <span>Size</span>
                                        <span>Stock</span>
                                        <span />
                                    </div>

                                    <div className="divide-y divide-slate-100">
                                        {brand.variants.map((variant, v) => {
                                            const key = (f) => `brands.${b}.variants.${v}.${f}`;
                                            return (
                                                <div
                                                    key={variant.id ?? `variant-${b}-${v}`}
                                                    className={cx('grid grid-cols-1 gap-3 px-5 py-3 sm:items-start', variantGrid)}
                                                >
                                                    <div>
                                                        <span className={mobileLabel}>Unit</span>
                                                        {/* User-defined unit: plain text input, type anything */}
                                                        <input
                                                            aria-label="Unit of measure"
                                                            type="text"
                                                            maxLength={50}
                                                            autoComplete="off"
                                                            placeholder="e.g. pcs, gallon, sack"
                                                            value={variant.unit_of_measure}
                                                            onChange={(e) => updateVariant(b, v, 'unit_of_measure', e.target.value)}
                                                            className={input(errors[key('unit_of_measure')])}
                                                        />
                                                        {errors[key('unit_of_measure')] && (
                                                            <p className="mt-1 text-xs text-red-600">{errors[key('unit_of_measure')]}</p>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <span className={mobileLabel}>Size</span>
                                                        <input
                                                            aria-label="Size"
                                                            type="text"
                                                            placeholder="e.g. 4 L"
                                                            value={variant.size}
                                                            onChange={(e) => updateVariant(b, v, 'size', e.target.value)}
                                                            className={input(errors[key('size')])}
                                                        />
                                                        {errors[key('size')] && <p className="mt-1 text-xs text-red-600">{errors[key('size')]}</p>}
                                                    </div>

                                                    <div>
                                                        <span className={mobileLabel}>{variant.id ? 'Stock' : 'Opening stock'}</span>
                                                        {variant.id ? (
                                                            // Saved variants: change stock via Stock in / Stock out so every change is logged.
                                                            <>
                                                                <div className="flex h-9 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-semibold tabular-nums text-slate-900">
                                                                    {variant.stock}
                                                                </div>
                                                                <p className="mt-1 text-xs text-slate-500">MOQ {variant.moq} (30 days)</p>
                                                            </>
                                                        ) : (
                                                            <input
                                                                aria-label="Opening stock"
                                                                type="number"
                                                                min="0"
                                                                step="1"
                                                                value={variant.stock}
                                                                onChange={(e) => updateVariant(b, v, 'stock', e.target.value)}
                                                                className={input(errors[key('stock')])}
                                                            />
                                                        )}
                                                        {errors[key('stock')] && <p className="mt-1 text-xs text-red-600">{errors[key('stock')]}</p>}
                                                    </div>

                                                    <div className="flex justify-end sm:h-9 sm:items-center">
                                                        {brand.variants.length > 1 && (
                                                            <IconButton icon={Trash2} label="Remove variant" danger onClick={() => removeVariant(b, v)} />
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                            );
                        })}

                        <button
                            type="button"
                            onClick={addBrand}
                            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-4 text-sm font-medium text-slate-500 transition hover:border-[#667292] hover:bg-white hover:text-[#667292]"
                        >
                            <Tags className="h-4 w-4" />
                            Add another brand
                        </button>
                    </div>

                    {/* Sticky summary */}
                    <aside className="xl:sticky xl:top-20">
                        <Panel title={isEditing ? 'Edit item' : 'New item'} description="Review, then save.">
                            <dl className="space-y-3">
                                <SummaryLine label="Item">{data.item_name || '—'}</SummaryLine>
                                <SummaryLine label="Brands">{brands.length}</SummaryLine>
                                <SummaryLine label="Variants">{totals.variantCount}</SummaryLine>
                                <SummaryLine label={isEditing ? 'Total stock' : 'Opening stock'}>{totals.stock}</SummaryLine>
                            </dl>

                            {hasErrors && <Banner tone="error" className="mt-4">Fix the highlighted fields before saving.</Banner>}

                            <div className="mt-5 flex flex-col gap-2">
                                <Button type="submit" variant="brand" className="w-full" disabled={processing}>
                                    {processing ? 'Saving…' : isEditing ? 'Save changes' : 'Create item'}
                                </Button>
                                <Link href={listUrl} className="block">
                                    <Button type="button" variant="outline" className="w-full">Cancel</Button>
                                </Link>
                            </div>
                        </Panel>
                    </aside>
                </div>
            </form>
        </>
    );
}