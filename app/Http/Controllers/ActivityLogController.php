<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ResolvesPerPage;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * PERMISSIONS: activity.view
 * Read-only on purpose: there is no edit or delete.
 */
class ActivityLogController extends Controller
{
    use ResolvesPerPage;

    public function index(Request $request)
    {
        abort_unless($request->user()->can('activity.view'), 403);

        $request->validate([
            'from' => 'nullable|date',
            'to'   => 'nullable|date',
        ]);

        $search  = trim($request->string('search')->toString());
        $event   = $request->string('event')->toString();
        $userId  = $request->string('user')->toString();
        $from    = $request->string('from')->toString();
        $to      = $request->string('to')->toString();
        $perPage = $this->perPage($request);

        $logs = ActivityLog::query()
            ->when($event !== '', fn ($q) => $q->where('event', $event))
            ->when(ctype_digit($userId), fn ($q) => $q->where('user_id', (int) $userId))
            ->when($from !== '', fn ($q) => $q->whereDate('created_at', '>=', $from))
            ->when($to !== '', fn ($q) => $q->whereDate('created_at', '<=', $to))
            ->when($search !== '', function ($q) use ($search) {
                $like = '%' . addcslashes($search, '%_\\') . '%';

                $q->where(fn ($q) => $q->where('description', 'like', $like)
                    ->orWhere('subject_label', 'like', $like)
                    ->orWhere('user_name', 'like', $like));
            })
            ->latest('id')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('Activity/Index', [
            'logs'    => $logs,
            'events'  => ActivityLog::query()->distinct()->orderBy('event')->pluck('event'),
            'users'   => User::orderBy('name')->get(['id', 'name']),
            'filters' => [
                'search'   => $search,
                'event'    => $event,
                'user'     => $userId,
                'from'     => $from,
                'to'       => $to,
                'per_page' => $perPage,
            ],
        ]);
    }
}