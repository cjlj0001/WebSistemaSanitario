from datetime import datetime, date, timezone
import hashlib
from io import BytesIO
from typing import Iterable, Literal
import uuid

import pydicom
from pydicom.dataset import Dataset
from pydicom.tag import Tag


AGE_RANGES: dict[str, tuple[int, int]] = {
    "0-18": (0, 18),
    "18-40": (18, 40),
    "40-65": (40, 65),
    "65+": (65, 150),
}


TAGS_TO_REMOVE: tuple[Tag, ...] = tuple(
    Tag(group, element)
    for group, element in [
        (0x0008, 0x0014),
        (0x0008, 0x0050),
        (0x0008, 0x0080),
        (0x0008, 0x0081),
        (0x0008, 0x0090),
        (0x0008, 0x0092),
        (0x0008, 0x0094),
        (0x0008, 0x1010),
        (0x0008, 0x1040),
        (0x0008, 0x1048),
        (0x0008, 0x1050),
        (0x0008, 0x1060),
        (0x0008, 0x1070),
        (0x0008, 0x1080),
        (0x0008, 0x1155),
        (0x0008, 0x2111),
        (0x0010, 0x0010),
        (0x0010, 0x0020),
        (0x0010, 0x0021),
        (0x0010, 0x0030),
        (0x0010, 0x0032),
        (0x0010, 0x0040),
        (0x0010, 0x1000),
        (0x0010, 0x1001),
        (0x0010, 0x1010),
        (0x0010, 0x1020),
        (0x0010, 0x1030),
        (0x0010, 0x1040),
        (0x0010, 0x1060),
        (0x0010, 0x1080),
        (0x0010, 0x1090),
        (0x0010, 0x2000),
        (0x0010, 0x2110),
        (0x0010, 0x21B0),
        (0x0018, 0x1000),
        (0x0020, 0x4000),
        (0x0040, 0x0275),
    ]
)


def calculate_age_range(birth_date: date | None) -> Literal["0-18", "18-40", "40-65", "65+"] | None:
    if birth_date is None:
        return None

    today = datetime.now().date()
    age = (today - birth_date).days // 365

    if age < 18:
        return "0-18"
    if age < 40:
        return "18-40"
    if age < 65:
        return "40-65"
    return "65+"


def get_age_range_min_max(age_range: str) -> tuple[int, int]:
    return AGE_RANGES.get(age_range, (0, 150))


def generate_anonymized_patient_id() -> str:
    return f"PAC-{uuid.uuid4().hex[:8].upper()}"


def build_series_instance_uid(study_uid: str, slot: int) -> str:
    base_uid = str(study_uid).strip().rstrip(".")
    if not base_uid:
        raise ValueError("study_uid no puede estar vacio")

    candidate = f"{base_uid}.{slot}"
    if len(candidate) <= 64:
        return candidate

    digest = hashlib.sha1(f"{base_uid}:{slot}".encode("utf-8")).digest()
    fallback_numeric_uid = str(int.from_bytes(digest[:16], "big"))
    return f"2.25.{fallback_numeric_uid}"


def _remove_tags_recursive(dataset: Dataset, tags: Iterable[Tag]) -> None:
    for tag in tags:
        if tag in dataset:
            del dataset[tag]

    for element in dataset:
        if element.VR == "SQ":
            for item in element.value:
                _remove_tags_recursive(item, tags)


def anonymize_dicom_file(dicom_file_path: str, anonymized_patient_id: str) -> bytes:
    dataset = pydicom.dcmread(dicom_file_path, force=True)

    dataset.remove_private_tags()
    _remove_tags_recursive(dataset, TAGS_TO_REMOVE)

    dataset.PatientID = anonymized_patient_id
    dataset.PatientName = anonymized_patient_id
    dataset.PatientIdentityRemoved = "YES"
    dataset.DeidentificationMethod = "Basic profile + private tags removed"

    if "BurnedInAnnotation" in dataset and str(dataset.BurnedInAnnotation).strip().upper() not in {"NO", ""}:
        dataset.BurnedInAnnotation = "NO"

    if not getattr(dataset, "StudyInstanceUID", None):
        dataset.StudyInstanceUID = pydicom.uid.generate_uid()
    if not getattr(dataset, "SeriesInstanceUID", None):
        dataset.SeriesInstanceUID = pydicom.uid.generate_uid()
    if not getattr(dataset, "SOPInstanceUID", None):
        dataset.SOPInstanceUID = pydicom.uid.generate_uid()

    output = BytesIO()
    dataset.save_as(output, write_like_original=False)
    return output.getvalue()


def stamp_upload_datetime(dicom_source: str | bytes, uploaded_at: datetime | None = None) -> bytes:
    if isinstance(dicom_source, bytes):
        dataset = pydicom.dcmread(BytesIO(dicom_source), force=True)
    else:
        dataset = pydicom.dcmread(dicom_source, force=True)

    timestamp = uploaded_at or datetime.now(timezone.utc)
    if timestamp.tzinfo is None:
        timestamp = timestamp.replace(tzinfo=timezone.utc)

    date_value = timestamp.strftime("%Y%m%d")
    time_value = timestamp.strftime("%H%M%S")
    datetime_value = timestamp.strftime("%Y%m%d%H%M%S")

    dataset.StudyDate = date_value
    dataset.StudyTime = time_value
    dataset.SeriesDate = date_value
    dataset.SeriesTime = time_value
    dataset.ContentDate = date_value
    dataset.ContentTime = time_value
    dataset.AcquisitionDate = date_value
    dataset.AcquisitionTime = time_value
    dataset.InstanceCreationDate = date_value
    dataset.InstanceCreationTime = time_value
    dataset.AcquisitionDateTime = datetime_value

    output = BytesIO()
    dataset.save_as(output, write_like_original=False)
    return output.getvalue()
