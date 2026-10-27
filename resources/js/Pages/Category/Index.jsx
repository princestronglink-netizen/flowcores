import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeading from '@/Components/PageHeading';
import PageCard from '@/Components/PageCard';
import PageToolbar from '@/Components/PageToolbar';
import Modal from '@/Components/Modal';
import ConfirmDelete from '@/Components/ConfirmationModal/ConfirmDelete';
import { Head, useForm } from '@inertiajs/react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/Components/ui/table';
import { Button } from '@/Components/ui/Button';
import { Plus, Pencil, Trash2, Tags } from 'lucide-react';
import { useState } from 'react';

const fieldClass =
    'mt-1.5 block w-full rounded-md border border-[#bccad6] px-3 py-2 text-sm focus:border-[#667292] focus:outline-none focus:ring-2 focus:ring-[#8d9db6]/40';

function CategoryModal({ category, show, onClose }) {
    const isEditing = Boolean(category);
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        category_name: category?.category_name ?? '',
        description: category?.description ?? '',
    });

    const close = () => {
        reset();
        clearErrors();
        onClose();
    };

    const submit = (e) => {
        e.preventDefault();
        const options = { preserveScroll: true, onSuccess: close };
        if (isEditing) put(route('categories.update', category.id), options);
        else post(route('categories.store'), options);
    };

    return (
        <Modal show={show} onClose={close} maxWidth="md">
            <form onSubmit={submit} noValidate className="p-6">
                <div className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#eef1f5] text-[#667292]">
                        <Tags className="size-5" />
                    </span>
                    <h2 className="text-base font-semibold text-[#3a4157]">{isEditing ? 'Edit category' : 'New category'}</h2>
                </div>

                <div className="mt-5 space-y-4">
                    <div>
                        <label htmlFor="category_name" className="block text-sm font-medium text-[#3a4157]">
                            Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="category_name"
                            type="text"
                            placeholder="e.g. Paints"
                            value={data.category_name}
                            onChange={(e) => setData('category_name', e.target.value)}
                            className={fieldClass}
                        />
                        {errors.category_name && <p className="mt-1 text-xs text-red-600">{errors.category_name}</p>}
                    </div>
                    <div>
                        <label htmlFor="category_description" className="block text-sm font-medium text-[#3a4157]">Description</label>
                        <input
                            id="category_description"
                            type="text"
                            placeholder="Optional"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            className={fieldClass}
                        />
                        {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description}</p>}
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={close}>Cancel</Button>
                    <Button type="submit" variant="brand" disabled={processing}>
                        {processing ? 'Saving…' : isEditing ? 'Save changes' : 'Create category'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

export default function Index({ categories }) {
    const [modal, setModal] = useState({ open: false, category: null });
    const [deleting, setDeleting] = useState(null);

    return (
        <AuthenticatedLayout header={<PageHeading title="Item Categories" subtitle="Group items to find them faster." />}>
            <Head title="Item Categories" />

            <PageCard
                toolbar={
                    <PageToolbar>
                        <Button variant="brand" onClick={() => setModal({ open: true, category: null })}>
                            <Plus />
                            New Category
                        </Button>
                    </PageToolbar>
                }
            >
                <div className="p-5">
                    {categories.length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">
                            No categories yet. Create one, then assign it to your items.
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Items</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {categories.map((c) => (
                                    <TableRow key={c.id}>
                                        <TableCell className="font-medium">{c.category_name}</TableCell>
                                        <TableCell>{c.description || '—'}</TableCell>
                                        <TableCell>{c.items_count}</TableCell>
                                        <TableCell className="flex justify-end gap-2 text-right">
                                            <Button variant="outline" size="icon" onClick={() => setModal({ open: true, category: c })}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="outline" size="icon" onClick={() => setDeleting(c)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </PageCard>

            {/* key remounts the form so it starts from the right category each time */}
            <CategoryModal
                key={modal.category?.id ?? 'new'}
                show={modal.open}
                category={modal.category}
                onClose={() => setModal({ open: false, category: null })}
            />

            <ConfirmDelete
                show={Boolean(deleting)}
                onClose={() => setDeleting(null)}
                deleteUrl={deleting ? route('categories.destroy', deleting.id) : null}
                itemLabel={deleting ? `"${deleting.category_name}". Its ${deleting.items_count} item(s) will become Uncategorized` : 'this category'}
                title="Delete category?"
            />
        </AuthenticatedLayout>
    );
}
