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
            $old = $stage->getOriginal('stage_code');

            // Stage code renamed: rename the permission so roles keep it.
            if ($old && $old !== $stage->stage_code) {
                Permission::where('name', static::permissionFor($old))
                    ->where('guard_name', 'web')
                    ->update(['name' => $stage->permissionName()]);
            }

            Permission::findOrCreate($stage->permissionName(), 'web');
            app(PermissionRegistrar::class)->forgetCachedPermissions();
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