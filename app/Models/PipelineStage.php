<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

class PipelineStage extends Model
{
    protected $table = 'pipeline_stages';

    protected $fillable = [
        'stage_code',
        'stage_name',
        'stage_description',
        'sort_order',
        'is_initial',
        'is_final',
        'deducts_stock',
        'creates_quotation',
        'creates_client_po',
        'partial_return_steps',
    ];

    protected $casts = [
        'is_initial'           => 'boolean',
        'is_final'             => 'boolean',
        'deducts_stock'        => 'boolean',
        'creates_quotation'    => 'boolean',
        'creates_client_po'    => 'boolean',
        'partial_return_steps' => 'integer',
    ];

    /* ---------------------------- Permissions ---------------------------- */

    public static function permissionFor(string $code): string
    {
        return "stage.{$code}.move";
    }

    public function permissionName(): string
    {
        return static::permissionFor($this->stage_code);
    }

    protected static function booted(): void
    {
        // Every stage always has its own permission.
        static::saved(function (PipelineStage $stage) {
            $registrar = app(PermissionRegistrar::class);
            $old       = $stage->getOriginal('stage_code');
            $new       = $stage->permissionName();

            // Stage code renamed: rename the permission so roles keep it.
            if ($old && $old !== $stage->stage_code) {
                $oldName = static::permissionFor($old);

                // Skip the rename if the new name already exists (it would violate the unique key).
                $newExists = Permission::where('name', $new)->where('guard_name', 'web')->exists();

                if (! $newExists) {
                    Permission::where('name', $oldName)
                        ->where('guard_name', 'web')
                        ->update(['name' => $new]);
                }

                // The rename is a raw update, so Spatie's cache is now stale.
                // Clear it BEFORE looking the permission up again.
                $registrar->forgetCachedPermissions();
            }

            // Query the database directly instead of Spatie's cached lookup (findOrCreate).
            Permission::firstOrCreate(['name' => $new, 'guard_name' => 'web']);

            $registrar->forgetCachedPermissions();
        });

        static::deleted(function (PipelineStage $stage) {
            Permission::where('name', $stage->permissionName())
                ->where('guard_name', 'web')
                ->delete();

            app(PermissionRegistrar::class)->forgetCachedPermissions();
        });
    }

    /* ----------------------------- Relations ----------------------------- */

    public function pipeline(): BelongsTo
    {
        return $this->belongsTo(Pipeline::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }
}