<?php

namespace App\Console\Commands;

use App\Models\Vehicle;
use App\Models\VehicleMedia;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;

/**
 * Gives listed cars a sample showroom (exterior 360° spin + interior look-around) until real
 * photos are shot. Sample media is flagged `is_sample`, so buyers see a "Sample preview" label
 * and it is replaced automatically the moment staff upload real media for that car.
 * The frames are rendered by resources/sample-media/render360.py.
 *
 *   php artisan rdg:sample-media            cars with no media at all
 *   php artisan rdg:sample-media --all      every car (replaces old sample media, never real photos)
 *   php artisan rdg:sample-media --specs    also fill empty spec fields with typical values
 */
class AttachSampleMedia extends Command
{
    protected $signature = 'rdg:sample-media {--all : Re-attach sample media to every car} {--vehicle= : Only this vehicle id} {--specs : Fill empty spec fields with typical values for the model}';

    protected $description = 'Attach sample 360° exterior/interior media to cars that have no real photos yet';

    private const TALL = '/innova|fortuner|montero|everest|xpander|avanza|terra|cr-?v|hiace|ertiga|stargazer|rush|mu-?x|trailblazer|veloz|br-?v|carnival|starex|staria|urvan|land ?cruiser|pajero|rav4|tucson|santa ?fe|sportage|xtrail|x-trail|innova/i';

    /** Typical specs used only with --specs, only for empty fields. */
    private const SPECS = [
        'innova' => ['body_type' => 'MPV', 'fuel_type' => 'Diesel', 'transmission' => 'Automatic', 'engine' => '2.8L Diesel', 'seats' => 7, 'drivetrain' => 'RWD'],
        'vios' => ['body_type' => 'Sedan', 'fuel_type' => 'Gasoline', 'transmission' => 'CVT', 'engine' => '1.3L', 'seats' => 5, 'drivetrain' => 'FWD'],
        'city' => ['body_type' => 'Sedan', 'fuel_type' => 'Gasoline', 'transmission' => 'CVT', 'engine' => '1.5L', 'seats' => 5, 'drivetrain' => 'FWD'],
        'fortuner' => ['body_type' => 'SUV', 'fuel_type' => 'Diesel', 'transmission' => 'Automatic', 'engine' => '2.4L Diesel', 'seats' => 7, 'drivetrain' => 'RWD'],
        'mirage' => ['body_type' => 'Hatchback', 'fuel_type' => 'Gasoline', 'transmission' => 'CVT', 'engine' => '1.2L', 'seats' => 5, 'drivetrain' => 'FWD'],
    ];

    private const FEATURES = "Power windows and locks\nAir-conditioning\nTouchscreen infotainment\nRear parking sensors\nABS with EBD\nDual front airbags";

    public function handle(): int
    {
        $source = resource_path('sample-media');
        if (! File::isDirectory($source)) {
            $this->error('resources/sample-media is missing.');

            return self::FAILURE;
        }

        $vehicles = Vehicle::with('media')
            ->when($this->option('vehicle'), fn ($q, $id) => $q->whereKey($id))
            ->get();

        $done = 0;
        foreach ($vehicles as $vehicle) {
            $hasReal = $vehicle->media->where('is_sample', false)->isNotEmpty();
            $hasSample = $vehicle->media->where('is_sample', true)->isNotEmpty();
            if ($hasReal || ($hasSample && ! $this->option('all'))) {
                $this->line("skip  #{$vehicle->id} {$vehicle->year} {$vehicle->make} {$vehicle->model}".($hasReal ? ' (has real photos)' : ' (already has samples)'));
                continue;
            }

            if ($this->option('specs')) {
                $this->fillSpecs($vehicle);
            }

            foreach ($vehicle->media->where('is_sample', true) as $old) {
                Storage::disk('public')->delete($old->file_path);
                $old->delete();
            }

            $set = $this->pickSet($vehicle);
            $interior = $vehicle->id % 2 === 0 ? 'interior-beige.jpg' : 'interior-dark.jpg';
            $order = 1;

            foreach (File::files("{$source}/{$set}") as $file) {
                $this->attach($vehicle, $file->getPathname(), "{$set}-{$file->getFilename()}", VehicleMedia::TYPE_360_FRAME, $order++);
            }
            $this->attach($vehicle, "{$source}/{$interior}", $interior, VehicleMedia::TYPE_INTERIOR_360, $order++);

            $vehicle->forceFill(['last_updated' => now()])->save();
            $this->info("added #{$vehicle->id} {$vehicle->year} {$vehicle->make} {$vehicle->model} ← {$set} + {$interior}");
            $done++;
        }

        $this->newLine();
        $this->info("{$done} car(s) now have sample 360° media.");

        return self::SUCCESS;
    }

    private function attach(Vehicle $vehicle, string $from, string $name, string $type, int $order): void
    {
        $path = "uploads/vehicle_media/sample-v{$vehicle->id}-{$name}";
        Storage::disk('public')->put($path, File::get($from));
        VehicleMedia::create(['vehicle_id' => $vehicle->id, 'file_path' => $path, 'type' => $type, 'sort_order' => $order, 'is_sample' => true]);
    }

    private function pickSet(Vehicle $vehicle): string
    {
        $tall = preg_match(self::TALL, "{$vehicle->model} {$vehicle->body_type}") || in_array(strtolower((string) $vehicle->body_type), ['mpv', 'suv', 'van', 'pickup'], true);
        $color = strtolower((string) $vehicle->color);
        $sets = $tall ? ['silver', 'black'] : ['white', 'red', 'gray'];
        $match = collect($sets)->first(fn ($c) => str_contains($color, $c) || ($c === 'gray' && str_contains($color, 'grey')) || ($c === 'silver' && str_contains($color, 'gray')));

        return ($tall ? 'mpv-' : 'sedan-').($match ?? $sets[$vehicle->id % count($sets)]);
    }

    private function fillSpecs(Vehicle $vehicle): void
    {
        $key = collect(array_keys(self::SPECS))->first(fn ($k) => str_contains(strtolower($vehicle->model), $k));
        $specs = $key ? self::SPECS[$key] : ['transmission' => 'Automatic', 'fuel_type' => 'Gasoline', 'seats' => 5];
        $specs['features'] = self::FEATURES;
        foreach ($specs as $field => $value) {
            if (blank($vehicle->{$field})) {
                $vehicle->{$field} = $value;
            }
        }
        $vehicle->save();
    }
}
