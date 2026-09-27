<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VehicleMedia extends Model
{
    use HasFactory;

    public const TYPE_360_FRAME = '360_frame';

    public const TYPE_PHOTO = 'photo';

    protected $table = 'vehicle_media';

    protected $fillable = [
        'vehicle_id',
        'file_path',
        'type',
        'sort_order',
    ];

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }
}
