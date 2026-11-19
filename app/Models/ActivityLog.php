<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Prunable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class ActivityLog extends Model
{
    use Prunable;

    public const UPDATED_AT = null;

    protected $fillable = [
        'user_id', 'user_name', 'event', 'description',
        'subject_type', 'subject_id', 'subject_label', 'properties', 'ip_address',
    ];

    protected $casts = [
        'properties' => 'array',
        'created_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function subject(): MorphTo
    {
        return $this->morphTo();
    }

    /** Keep one year of logs. Schedule: Schedule::command('model:prune')->daily(); */
    public function prunable()
    {
        return static::where('created_at', '<', now()->subYear());
    }

    /**
     * Write one log row. Never lets a logging failure break the real action.
     * $actor: pass it when auth()->user() is not reliable (e.g. the Logout event).
     */
    public static function record(
        string $event,
        string $description,
        ?Model $subject = null,
        array $properties = [],
        ?string $label = null,
        ?User $actor = null,
    ): ?self {
        try {
            $user = $actor ?? auth()->user();

            return static::create([
                'user_id'       => $user?->id,
                'user_name'     => $user?->name,
                'event'         => $event,
                'description'   => $description,
                'subject_type'  => $subject ? $subject::class : null,
                'subject_id'    => $subject?->getKey(),
                'subject_label' => $label,
                'properties'    => $properties ?: null,
                'ip_address'    => request()?->ip(),
            ]);
        } catch (\Throwable $e) {
            report($e);

            return null;
        }
    }
}