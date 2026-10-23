"""Generate Arrow IPC regression fixtures (requires pyarrow)."""
from datetime import date
from pathlib import Path

import pyarrow as pa
import pyarrow.feather as feather

out = Path(__file__).parent / "arrow-compression"
out.mkdir(exist_ok=True)
table = pa.table({
    "site": pa.array([50136] * 1024, type=pa.int32()),
    "date": pa.array([date(1957, 4, 1)] * 1024, type=pa.date32()),
    "temperature": pa.array([-8.8, None] * 512, type=pa.float64()),
    "label": pa.array(["cold", "warm"] * 512).dictionary_encode(),
    "empty": pa.array([None] * 1024, type=pa.float64()),
})
for codec in ("uncompressed", "lz4", "zstd"):
    feather.write_feather(table, out / f"{codec}.feather", compression=codec)
