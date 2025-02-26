import re
import csv
import sys
import os
from typing import Counter
from PyPDF2 import PdfReader

# Aumentar el límite de tamaño del campo CSV
csv.field_size_limit(sys.maxsize)

# Compilación de expresiones regulares
RGX_PATH = re.compile(r'^.*\\Path\s+\d+:')
RGX_SEVERITY = re.compile(r'Severity\s*(.*)$')
RGX_FILE_NAME = re.compile(r'File Name\s*(.*)$')
RGX_LINE = re.compile(r'Line\s*(.*)$')
RGX_OBJECT = re.compile(r'Object\s*(.*)$')
RGX_DESCRIPTION = re.compile(r'Source Destination\s*(.*)$')
RGX_DATE = re.compile(r'Detection Date\s*(.*)$')
DELIMITER = '|'

####################################################################################
def sev_save_to_csv(info, base_path, file_name):
    if not info:
        raise ValueError("No hay datos para guardar.")
    
    # Crear la ruta completa de la carpeta bajo /sysx/bito/projects
    folder_path = os.path.join(base_path)

    # Crear la carpeta si no existe
    if not os.path.exists(folder_path):
        os.makedirs(folder_path)

    # Construir la ruta completa del archivo CSV dentro de la nueva carpeta
    full_file_path = os.path.join(folder_path, file_name)

    # Contar las ocurrencias de cada severidad
    severidades = Counter(registro['Severity'] for registro in info)
    
    # Obtener la cantidad de vulnerabilidades por severidad
    total_high = severidades.get('High', 0)
    total_medium = severidades.get('Medium', 0)
    total_low = severidades.get('Low', 0)

    # Total general
    total = total_high + total_medium + total_low

    # Escribimos la información extraída en un archivo de texto
    with open(full_file_path, 'w', newline='', encoding='utf-8') as output_file:
        # Crear el escritor de CSV
        escritor = csv.writer(output_file)
        
        # Escribir la cabecera
        escritor.writerow(['High', 'Medium', 'Low', 'Total'])
        
        # Escribir los datos
        escritor.writerow([total_high, total_medium, total_low, total])


####################################################################################

def extraer_texto_de_pdf(ruta_pdf):
    try:
        with open(ruta_pdf, 'rb') as archivo:
            lector_pdf = PdfReader(archivo)
            numero_de_paginas = len(lector_pdf.pages)
            texto_completo = ""

            for pagina in range(numero_de_paginas):
                pagina_objeto = lector_pdf.pages[pagina]
                texto_pagina = pagina_objeto.extract_text() if pagina_objeto.extract_text() else ""
                texto_pagina = texto_pagina.replace("'", '"')  # Elimina comillas simples y deja comillas dobles
                texto_completo += texto_pagina
            
            return texto_completo
    except Exception as e:
        raise RuntimeError(f"Error al extraer texto: {e}")

def split_by_frags(txt):
    frags = []
    current_frags = []

    for line in txt.split('\n'):
        if RGX_PATH.match(line):
            if current_frags:
                frags.append('\n'.join(current_frags))
                current_frags = []
        current_frags.append(line)
    if current_frags:
        frags.append('\n'.join(current_frags))
    
    return frags

def get_info_frags(frags):
    info_all_frags = []
    valid_fragments = True  # Variable para verificar la validez de los fragmentos

    for frag in frags:
        info_frag = {}
        
        lines = frag.split('\n')
        flag_txt_desc = False
        description = []
        file_name = None
        
        for line in lines:
            try:
                # Comprobar coincidencias antes de acceder a sus grupos
                path_match = RGX_PATH.match(line)
                severity_match = RGX_SEVERITY.match(line)
                date_match = RGX_DATE.match(line)
                description_match = RGX_DESCRIPTION.match(line)
                file_name_match = RGX_FILE_NAME.match(line)
                line_match = RGX_LINE.match(line)
                object_match = RGX_OBJECT.match(line)

                if path_match:
                    info_frag['Type'] = path_match.group()  # Usar group() directamente aquí
                elif severity_match:
                    if severity_match.lastindex >= 1:  # Verifica si hay al menos un grupo
                        info_frag['Severity'] = severity_match.group(1)
                elif date_match:
                    flag_txt_desc = True  
                elif description_match:  
                    flag_txt_desc = False
                    description_text = ' '.join(description)
                    description_text = re.sub(r'\bof\s+[^.]*\.php', '', description_text).strip()
                    description_text = re.sub(r'\bin\s+[^.]*\.php', '', description_text).strip()
                    description_text = re.sub(r'\bpage\b(?!\bpage\b).*?\.php', 'page', description_text).strip()
                    info_frag['Description'] = description_text
                elif flag_txt_desc:
                    description.append(line.strip())
                elif file_name_match:
                    if file_name_match.lastindex >= 1:  # Verifica si hay al menos un grupo
                        file_name = file_name_match.group(1).strip()
                        # Guardar solo la ruta relativa sin repetir la carpeta base
                        info_frag['File Name'] = file_name
                elif line_match:
                    if line_match.lastindex >= 1:  # Verifica si hay al menos un grupo
                        info_frag['Line'] = line_match.group(1).split()[0]
                elif object_match:
                    if object_match.lastindex >= 1:  # Verifica si hay al menos un grupo
                        info_frag['Object'] = object_match.group(1).split()[0]
                # else:
                #     print(f"No coincide con ninguna expresión regular: {line}") 
            
            except IndexError as e:
                continue  # Continúa con la siguiente línea
            
        # Verificación de validaciones esenciales
        if not info_frag.get('Type') or not info_frag.get('Severity') or not info_frag.get('Description'):
            valid_fragments = False
        
        if info_frag:
            info_all_frags.append(info_frag)

    return info_all_frags, valid_fragments

def clean_info(info):
    for frag in info:
        for key in frag:
            frag[key] = frag[key].strip()
            if ' PAGE' in frag[key]:
                index = frag[key].find(' PAGE')
                frag[key] = frag[key][:index]
        tmp = frag['Type'].split('\\')
        frag['Type'] = tmp[0]
    return info

def buscar_archivo(base_path, relative_path):
    """Buscar un archivo de forma recursiva en la carpeta base."""
    for dirpath, dirnames, filenames in os.walk(base_path):
        for filename in filenames:
            if filename == os.path.basename(relative_path):
                return os.path.join(dirpath, filename)
    print(f"Archivo {relative_path} no encontrado.")
    return None

def obtener_tamano_archivo(base_path, relative_path):
    """Obtener el tamaño del archivo buscando recursivamente en la carpeta base."""
    ruta_completa = buscar_archivo(base_path, relative_path)
    if ruta_completa:
        try:
            return os.path.getsize(ruta_completa)
        except FileNotFoundError:
            print(f"Archivo no encontrado: {ruta_completa}")
            return 0
    else:
        return 0

def actualizar_csv_con_tamano(base_path, csv_path):
    """Leer un CSV, buscar las rutas de archivo en 'File Name', calcular el tamaño de esos archivos y actualizar el CSV."""
    
    # Crear una lista para almacenar las filas actualizadas
    filas_actualizadas = []
    
    # Leer el CSV existente
    with open(csv_path, mode='r', newline='', encoding='utf-8') as archivo_csv:
        lector_csv = csv.DictReader(archivo_csv, delimiter='|')
        fieldnames = lector_csv.fieldnames + ['Tamaño del archivo (bytes)']
        
        for row in lector_csv:
            # Obtener el nombre del archivo desde la columna 'File Name'
            file_name = row['File Name']
            
            # Obtener el tamaño del archivo, buscando desde la carpeta base
            file_size = obtener_tamano_archivo(base_path, file_name)
            print(f"Tamaño del archivo '{file_name}': {file_size} bytes")
            
            # Añadir el tamaño del archivo a la fila actual
            row['Tamaño del archivo (bytes)'] = file_size
            
            # Agregar la fila actualizada a la lista
            filas_actualizadas.append(row)
    
    # Escribir las filas actualizadas en un nuevo CSV o sobrescribir el existente
    with open(csv_path, mode='w', newline='', encoding='utf-8') as archivo_csv:
        escritor_csv = csv.DictWriter(archivo_csv, fieldnames=fieldnames, delimiter='|', quoting=csv.QUOTE_MINIMAL, escapechar='\\')
        escritor_csv.writeheader()
        for row in filas_actualizadas:
            escritor_csv.writerow(row)

    print(f"CSV actualizado guardado en {csv_path}")

def save_to_csv(info, base_path, file_name):
    if not info:
        raise ValueError("No hay datos para guardar.")

    # Extraer el nombre de la carpeta desde el nombre del archivo CSV
    folder_name = os.path.basename(base_path)

    # Crear la ruta completa de la carpeta bajo base_path
    folder_path = os.path.join(base_path)

    # Crear la carpeta si no existe
    if not os.path.exists(folder_path):
        os.makedirs(folder_path)

    # Construir la ruta completa del archivo CSV dentro de la nueva carpeta
    full_file_path = os.path.join(folder_path, file_name)

    # Agregar la información al CSV
    keys = list(info[0].keys())

    with open(full_file_path, 'w', newline='', encoding='utf-8') as output_file:
        dict_writer = csv.DictWriter(output_file, fieldnames=keys, delimiter=DELIMITER, quoting=csv.QUOTE_MINIMAL, escapechar='\\')
        dict_writer.writeheader()
        for row in info:
            for key in row:
                # Asegurar que el valor es una cadena de texto antes de aplicar replace
                value = str(row[key])  # Convertir a cadena
                row[key] = value.replace('|', '\\|')  # Escapar pipes dentro del contenido

                # Modificar la ruta en la columna 'File Name' para que contenga el prefijo correcto
                if key == 'File Name':
                    row[key] = f"/sysx/bito/projects/{folder_name}/{row[key]}"
            
            dict_writer.writerow(row)

    print(f"CSV guardado en {full_file_path}")

    # Actualizar el CSV con el tamaño de los archivos
    actualizar_csv_con_tamano(base_path, full_file_path)

def group_by_file_name(info):
    groups = {}
    for element in info:
        file_name = element["File Name"]
        if file_name in groups:
            groups[file_name].append(element)
        else:
            groups[file_name] = [element]

    final_groups = []
    for group in groups:
        total_des = []
        for vul in groups[group]:
            total_des.append(vul['Description'])

        final_groups.append(
            {
                'File Name': group,
                'Description': ' '.join(total_des)  # Cambiado de '\n' a ' ' para juntar las descripciones en una sola línea
            }
        )

    return final_groups

def obtener_ultimo_pdf(ruta, nombre_pdf):
    try:
        archivos = [f for f in os.listdir(ruta) if f.endswith('.pdf')]
        if not archivos:
            raise FileNotFoundError(f"No se encontraron archivos PDF en la ruta {ruta}")
        archivos.sort(key=lambda f: os.path.getmtime(os.path.join(ruta, f)), reverse=True)
        return os.path.join(ruta, nombre_pdf)
    except Exception as e:
        raise RuntimeError(f"Error al obtener el último PDF: {e}")

def extraer_nombre_aplicacion(pdf_file_name):
    return pdf_file_name.split('.', 1)[-1]  # Extrae todo lo que sigue después del primer punto

def main():
    try:
        nombre_aplicacion = sys.argv[1]  # Quitar la extensión del nombre de la aplicación
        nombre_pdf = sys.argv[2]
        id_proyecto = sys.argv[3]
        
        ruta = f'/sysx/bito/projects/{id_proyecto}_{nombre_aplicacion}'
        pdf_path = obtener_ultimo_pdf(ruta, nombre_pdf)
        
        # Generar el nombre del archivo CSV
        csv_file_name = f'checkmarx_{id_proyecto}_{nombre_aplicacion}.csv'
        
        txt_from_pdf = extraer_texto_de_pdf(pdf_path)

        position_txt = txt_from_pdf.find("Scan Results Details")
        if position_txt != -1:
            useful_txt = txt_from_pdf[position_txt:]
        else:
            raise RuntimeError("ERROR - 'Scan Results Details' not found")

        all_frags = split_by_frags(useful_txt)
        all_dic_frags, valid_fragments = get_info_frags(all_frags)

        all_dic_clean = clean_info(all_dic_frags)
        groups = group_by_file_name(all_dic_clean)

        save_to_csv(groups, ruta, csv_file_name)

        #####################################################################################            
        sev_csv_file_name = f'checkmarx_tot_{id_proyecto}_{nombre_aplicacion}.csv'
    
        sev_save_to_csv(all_dic_frags, ruta, sev_csv_file_name)  
        ######################################################################################

    except Exception as e:
        print(f"Error crítico: {e}")
        sys.exit(1)
     
if __name__ == '__main__':
    main()
