<?php

namespace App\Models\Concerns;

use App\Models\ActivityLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;

/**
 * Logs created / updated / deleted automatically, with old and new values.
 * Use it only on models that are saved as a single row.
 */
trait LogsActivity
{
    public static function bootLogsActivity(): void
    {
        static::created(fn (Model $m) => $m->writeActivity('created'));
        static::updated(fn (Model $m) => $m->writeActivity('updated'));
        static::deleted(fn (Model $m) => $m->writeActivity('deleted'));
    }

    /** Override per model: what to show as the record's name. */
    protected function activityLabel(): string
    {
        return (string) ($this->name ?? "#{$this->getKey()}");
    }

    /** Override per model: noisy / internal columns to leave out. */
    protected function activityIgnore(): array
    {
        return [];
    }

    protected function writeActivity(string $event): void
    {
        $skip = array_merge(
            ['created_at', 'updated_at', 'password', 'remember_token'],
            $this->activityIgnore()
        );

        if ($event === 'updated') {
            $new = Arr::except($this->getChanges(), $skip);

            if (! $new) {
                return; // only ignored columns changed
            }

            $props = [
                'old' => Arr::only($this->getOriginal(), array_keys($new)),
                'new' => $new,
            ];
        } elseif ($event === 'created') {
            $props = ['new' => Arr::except($this->getAttributes(), $skip)];
        } else {
            $props = ['old' => Arr::except($this->getAttributes(), $skip)];
        }

        $kind  = Str::snake(class_basename($this));
        $label = $this->activityLabel();

        ActivityLog::record(
            "{$kind}.{$event}",
            ucfirst($event) . ' ' . Str::headline($kind) . " “{$label}”",
            $this,
            $props,
            $label,
        );
    }
}