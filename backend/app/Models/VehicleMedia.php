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

    /** One wide look-around panorama of the cabin (drag left/right). */
    public const TYPE_INTERIOR_360 = 'interior_360';

    public const TYPES = [self::TYPE_360_FRAME, self::TYPE_INTERIOR_360, self::TYPE_PHOTO];

    protected $table = 'vehicle_media';

    protected $fillable = [
        'vehicle_id',
        'file_path',
        'type',
        'sort_order',
        'is_sample',
    ];

    protected $casts = ['is_sample' => 'boolean'];

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }
}
