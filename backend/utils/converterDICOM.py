import os
from PIL import Image
import numpy as np
import pydicom
from pydicom.dataset import FileDataset, Dataset
from pydicom.uid import ExplicitVRLittleEndian


supportedFormats = {'.jpeg', '.jpg', '.bmp', '.png', '.gif', '.tiff', '.tif', '.dcm'}


def imageToDicom(imagePath: str, outputDicomPath: str) -> bool:
    """
    Convierte una imagen (JPEG, BMP, PNG, GIF, TIFF) a formato DICOM.
    
    Args:
        imagePath: Ruta de la imagen de entrada
        outputDicomPath: Ruta del archivo DICOM de salida
    
    Returns:
        bool: True si la conversiÃ³n fue exitosa, False en caso contrario
    """
    try:
        # Verificar que el archivo existe
        if not os.path.exists(imagePath):
            print(f"Error: El archivo {imagePath} no existe")
            return False
        
        # Verificar que la extensiÃ³n es soportada
        fileExt = os.path.splitext(imagePath)[1].lower()
        if fileExt not in supportedFormats:
            print(f"Error: Formato de archivo no soportado. Soportados: {supportedFormats}")
            return False
        
        # Si es DICOM, no hacer nada, solo retornar True
        if fileExt == '.dcm':
            return True

        # Abrir la imagen y detectar si es monocroma o color.
        img = Image.open(imagePath)
        mode = img.mode

        # Normalizar a arreglos numpy sin forzar a RGB aún.
        if mode in ("L", "I", "I;16"):
            # Imagen monocroma
            imgGray = img.convert('L')
            imgArray = np.array(imgGray, dtype=np.uint8)
            is_color = False
        else:
            # Tratar como RGB (incluye 'RGBA', 'P', etc.)
            imgRgb = img.convert('RGB')
            imgArray = np.array(imgRgb, dtype=np.uint8)
            is_color = True

        # Crear el archivo DICOM
        fileMeta = Dataset()
        fileMeta.MediaStorageSOPClassUID = '1.2.840.10008.5.1.4.1.1.7'
        fileMeta.MediaStorageSOPInstanceUID = pydicom.uid.generate_uid()
        fileMeta.TransferSyntaxUID = ExplicitVRLittleEndian
        
        # Crear dataset
        ds = FileDataset(
            outputDicomPath,
            {},
            file_meta=fileMeta,
            preamble=b"\0" * 128,
        )
        ds.is_implicit_VR = False
        ds.is_little_endian = True
        ds.SOPClassUID = fileMeta.MediaStorageSOPClassUID
        ds.SOPInstanceUID = fileMeta.MediaStorageSOPInstanceUID
        ds.StudyInstanceUID = pydicom.uid.generate_uid()
        ds.SeriesInstanceUID = pydicom.uid.generate_uid()
        ds.Modality = "OT"
        ds.PatientID = "UNKNOWN"
        ds.PatientName = "UNKNOWN"
        
        # Información de la imagen
        if is_color:
            ds.SamplesPerPixel = 3
            ds.PhotometricInterpretation = "RGB"
            ds.PlanarConfiguration = 0
            ds.Rows = imgArray.shape[0]
            ds.Columns = imgArray.shape[1]
            ds.BitsAllocated = 8
            ds.BitsStored = 8
            ds.HighBit = 7
            ds.PixelRepresentation = 0
            # Pixel data expects bytes in RGBRGB... order
            ds.PixelData = imgArray.tobytes()
        else:
            # Monocroma
            ds.SamplesPerPixel = 1
            ds.PhotometricInterpretation = "MONOCHROME2"
            ds.Rows = imgArray.shape[0]
            ds.Columns = imgArray.shape[1]
            ds.BitsAllocated = 8
            ds.BitsStored = 8
            ds.HighBit = 7
            ds.PixelRepresentation = 0
            ds.PixelData = imgArray.tobytes()
        
        # Guardar archivo DICOM
        ds.save_as(outputDicomPath, write_like_original=False)
        
        print(f"Conversion exitosa: {imagePath} -> {outputDicomPath}")
        return True
    
    except Exception as e:
        print(f"Error al convertir imagen a DICOM: {str(e)}")
        return False


def batchConvertToDicom(inputDirectory: str, outputDirectory: str) -> int:
    if not os.path.exists(outputDirectory):
        os.makedirs(outputDirectory)
    
    convertedCount = 0
    
    for filename in os.listdir(inputDirectory):
        fileExt = os.path.splitext(filename)[1].lower()
        
        if fileExt in supportedFormats:
            inputPath = os.path.join(inputDirectory, filename)
            outputFilename = f"{os.path.splitext(filename)[0]}.dcm"
            outputPath = os.path.join(outputDirectory, outputFilename)
            
            if imageToDicom(inputPath, outputPath):
                convertedCount += 1
    
    print(f"Total de archivos convertidos: {convertedCount}")
    return convertedCount

