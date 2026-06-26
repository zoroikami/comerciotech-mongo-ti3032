import zipfile
import xml.etree.ElementTree as ET
import os
import re
import shutil

# XML namespaces
NS = {
    'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    'wp': 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
    'pic': 'http://schemas.openxmlformats.org/drawingml/2006/picture',
    'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
    'rel': 'http://schemas.openxmlformats.org/package/2006/relationships'
}

def get_ns_tag(prefix, tag):
    return f"{{{NS[prefix]}}}{tag}"

def parse_relationships(docx_zip):
    """Parse document relationships to map relationship ID to image target file."""
    rels = {}
    try:
        xml_content = docx_zip.read('word/_rels/document.xml.rels')
        root = ET.fromstring(xml_content)
        for rel in root.findall('.//rel:Relationship', NS):
            r_id = rel.get('Id')
            r_type = rel.get('Type')
            r_target = rel.get('Target')
            if "image" in r_type:
                rels[r_id] = r_target
    except Exception as e:
        print(f"Warning parsing relationships: {e}")
    return rels

def extract_images_from_element(element, docx_zip, rels, image_dir_abs, doc_prefix, image_counter):
    """Find all images (blips) in an XML element, extract them, and return Markdown image tags."""
    img_markdowns = []
    
    # Find all blips in this element
    for blip in element.iter(get_ns_tag('a', 'blip')):
        r_id = blip.get(get_ns_tag('r', 'embed'))
        if r_id and r_id in rels:
            target_path = rels[r_id]
            # Target is usually 'media/image1.png', but can be absolute or relative within the zip
            zip_image_path = f"word/{target_path}" if not target_path.startswith("word/") else target_path
            
            # Get extension
            _, ext = os.path.splitext(target_path)
            if not ext:
                ext = ".png"
            
            image_name = f"{doc_prefix}_img{image_counter[0]}{ext}"
            dest_path = os.path.join(image_dir_abs, image_name)
            
            try:
                # Extract image from zip
                with docx_zip.open(zip_image_path) as source:
                    with open(dest_path, "wb") as target:
                        shutil.copyfileobj(source, target)
                
                # Rel path from the md file (which is in docs/ and image is in docs/images/)
                md_image_path = f"images/{image_name}"
                img_markdowns.append(f"![screenshot]({md_image_path})")
                image_counter[0] += 1
                print(f"Extracted image {r_id} ({zip_image_path}) -> {image_name}")
            except Exception as e:
                print(f"Error extracting image {r_id} from {zip_image_path}: {e}")
                
    return img_markdowns

def parse_paragraph_text(p_element):
    """Extract full plain text from a paragraph element."""
    p_text = []
    for run in p_element.iter(get_ns_tag('w', 't')):
        if run.text:
            p_text.append(run.text)
    return "".join(p_text)

def clean_cell_text(text):
    """Clean newlines and trailing/leading space for Markdown table cell."""
    if not text:
        return ""
    text = text.strip()
    # Replace newlines with <br> to prevent breaking Markdown tables
    text = text.replace("\n", "<br>")
    text = text.replace("\r", "")
    # Escape pipe characters which break tables
    text = text.replace("|", "\\|")
    return text

def convert_docx_to_md(docx_path, output_md_path, image_dir_abs, doc_prefix):
    """Convert a docx file to formatted markdown and extract screenshots."""
    print(f"\nConverting {docx_path}...")
    
    if not os.path.exists(docx_path):
        print(f"Error: file {docx_path} does not exist.")
        return
        
    if not os.path.exists(image_dir_abs):
        os.makedirs(image_dir_abs)
        
    image_counter = [1] # mutable list for reference sharing
    
    with zipfile.ZipFile(docx_path) as docx:
        rels = parse_relationships(docx)
        xml_content = docx.read('word/document.xml')
        root = ET.fromstring(xml_content)
        
        body = root.find('w:body', NS)
        if body is None:
            print("Error: No w:body found in document.")
            return
            
        md_lines = []
        
        for child in body:
            tag = child.tag.split('}')[-1]
            
            if tag == 'p':
                # Paragraph
                pPr = child.find('w:pPr', NS)
                pStyle = pPr.find('w:pStyle', NS) if pPr is not None else None
                style_val = pStyle.get(get_ns_tag('w', 'val')) if pStyle is not None else None
                
                text = parse_paragraph_text(child)
                text_stripped = text.strip()
                
                # Check for images in this paragraph
                images_md = extract_images_from_element(child, docx, rels, image_dir_abs, doc_prefix, image_counter)
                
                # Check if it is a heading
                is_heading = False
                heading_level = 0
                
                if style_val:
                    style_lower = style_val.lower()
                    if "heading1" in style_lower or "título1" in style_lower or "heading 1" in style_lower:
                        is_heading = True
                        heading_level = 1
                    elif "heading2" in style_lower or "título2" in style_lower or "heading 2" in style_lower:
                        is_heading = True
                        heading_level = 2
                    elif "heading3" in style_lower or "título3" in style_lower or "heading 3" in style_lower:
                        is_heading = True
                        heading_level = 3
                
                # Heuristic heading check based on numbering
                # Level 1: "1. Introducción", "📋 1. Diagnóstico..."
                # Level 2: "2.1 Descripción..."
                # Level 3: "2.1.1 Subtitle..."
                if not is_heading and text_stripped:
                    # Emoji followed by numbering or just numbering at start
                    if re.match(r'^[📋💻⚙🛠🔒🗄💾📝]*\s*\d+\.\s+.*$', text_stripped):
                        is_heading = True
                        heading_level = 1
                    elif re.match(r'^\d+\.\d+\s+.*$', text_stripped):
                        is_heading = True
                        heading_level = 2
                    elif re.match(r'^\d+\.\d+\.\d+\s+.*$', text_stripped):
                        is_heading = True
                        heading_level = 3
                
                if is_heading:
                    prefix = "#" * heading_level
                    md_lines.append(f"\n{prefix} {text_stripped}")
                    # If there were images inside a heading, append them
                    for img in images_md:
                        md_lines.append(img)
                elif style_val in ('Prrafodelista', 'ListParagraph', 'List Paragraph'):
                    # List item
                    if text_stripped or images_md:
                        img_str = " ".join(images_md)
                        spaced_img = f" {img_str}" if img_str else ""
                        md_lines.append(f"- {text_stripped}{spaced_img}")
                else:
                    # Normal paragraph
                    if text_stripped or images_md:
                        img_str = "\n".join(images_md)
                        spaced_img = f"\n{img_str}" if img_str else ""
                        md_lines.append(f"{text_stripped}{spaced_img}")
                    elif not text_stripped and not images_md:
                        # Append an empty line if needed, but avoid double empties
                        if md_lines and md_lines[-1] != "":
                            md_lines.append("")
                            
            elif tag == 'tbl':
                # Table
                rows = child.findall('.//w:tr', NS)
                if not rows:
                    continue
                    
                num_rows = len(rows)
                # Count max columns
                num_cols = max(len(row.findall('.//w:tc', NS)) for row in rows)
                
                if num_rows == 1 and num_cols == 1:
                    # Single-cell callout or screenshot container
                    cell = rows[0].find('.//w:tc', NS)
                    cell_paragraphs = cell.findall('.//w:p', NS)
                    cell_text_list = []
                    cell_images = []
                    
                    for cp in cell_paragraphs:
                        ct = parse_paragraph_text(cp).strip()
                        c_imgs = extract_images_from_element(cp, docx, rels, image_dir_abs, doc_prefix, image_counter)
                        cell_images.extend(c_imgs)
                        if ct:
                            cell_text_list.append(ct)
                            
                    cell_text = "\n".join(cell_text_list).strip()
                    
                    # If it has images, format them
                    img_block = "\n".join(cell_images)
                    
                    # Decide how to render
                    if cell_text:
                        # Check if it looks like code block (contains code keyword or multiple lines of commands)
                        # e.g., starts with '#', 'systemctl', 'sudo', 'mongo', or contains code blocks
                        is_code = (
                            len(cell_text_list) > 1 and 
                            (any(line.startswith("sudo") or line.startswith("#") or line.startswith("systemctl") or "db." in line for line in cell_text_list) 
                             or "UPDATE" in cell_text or "SELECT" in cell_text or "pymongo" in cell_text)
                        )
                        
                        # Special handling for document title (Table 0)
                        if "INFORME TÉCNICO" in cell_text or "INFORME DE REQUISITOS" in cell_text:
                            md_lines.append(f"\n---\n\n# {cell_text.replace(chr(10), ' - ')}\n\n---")
                        elif is_code:
                            md_lines.append(f"\n```bash\n{cell_text}\n```")
                            if img_block:
                                md_lines.append(img_block)
                        else:
                            # Render as blockquote or just plain text
                            md_lines.append(f"\n> {cell_text.replace(chr(10), chr(10) + '> ')}")
                            if img_block:
                                md_lines.append(img_block)
                    elif img_block:
                        md_lines.append(f"\n{img_block}")
                else:
                    # Standard data table
                    table_md = []
                    headers = []
                    
                    # Extract headers
                    first_row_cells = rows[0].findall('.//w:tc', NS)
                    for cell in first_row_cells:
                        # Extract cell text
                        cell_text_parts = [parse_paragraph_text(p) for p in cell.findall('.//w:p', NS)]
                        # Also check if header cell contains images
                        cell_imgs = []
                        for p in cell.findall('.//w:p', NS):
                            cell_imgs.extend(extract_images_from_element(p, docx, rels, image_dir_abs, doc_prefix, image_counter))
                        
                        full_txt = clean_cell_text("\n".join(cell_text_parts))
                        if cell_imgs:
                            img_str = " ".join(cell_imgs)
                            full_txt += f"<br>{img_str}"
                        headers.append(full_txt if full_txt else " ")
                    
                    # Header row
                    table_md.append(f"| {' | '.join(headers)} |")
                    # Divider row
                    table_md.append(f"| {' | '.join(['---'] * len(headers))} |")
                    
                    # Extract body rows
                    for r in rows[1:]:
                        row_cells = r.findall('.//w:tc', NS)
                        row_txt = []
                        for cell in row_cells:
                            cell_text_parts = [parse_paragraph_text(p) for p in cell.findall('.//w:p', NS)]
                            # Check for images in cell
                            cell_imgs = []
                            for p in cell.findall('.//w:p', NS):
                                cell_imgs.extend(extract_images_from_element(p, docx, rels, image_dir_abs, doc_prefix, image_counter))
                            
                            full_txt = clean_cell_text("\n".join(cell_text_parts))
                            if cell_imgs:
                                img_str = " ".join(cell_imgs)
                                full_txt += f"<br>{img_str}"
                            row_txt.append(full_txt if full_txt else " ")
                        
                        # Pad row if columns don't match header
                        if len(row_txt) < len(headers):
                            row_txt.extend([" "] * (len(headers) - len(row_txt)))
                        elif len(row_txt) > len(headers):
                            row_txt = row_txt[:len(headers)]
                            
                        table_md.append(f"| {' | '.join(row_txt)} |")
                        
                    md_lines.append("\n" + "\n".join(table_md) + "\n")
                    
        # Write markdown content to output file
        with open(output_md_path, "w", encoding="utf-8") as f:
            f.write("\n".join(md_lines))
            
        print(f"Successfully converted and saved: {output_md_path}")
        print(f"Total screenshots extracted from this document: {image_counter[0] - 1}")

if __name__ == "__main__":
    workspace_dir = r"c:\wamp64\www\nohinohey"
    docs_dir = os.path.join(workspace_dir, "docs")
    images_dir = os.path.join(docs_dir, "images")
    
    # 1. Convert InformeBDHaroldKeoni.docx
    convert_docx_to_md(
        os.path.join(workspace_dir, "InformeBDHaroldKeoni.docx"),
        os.path.join(docs_dir, "InformeBDHaroldKeoni.md"),
        images_dir,
        "informe_bd"
    )
    
    # 2. Convert InformeHaroldKeoni.docx
    convert_docx_to_md(
        os.path.join(workspace_dir, "InformeHaroldKeoni.docx"),
        os.path.join(docs_dir, "InformeHaroldKeoni.md"),
        images_dir,
        "informe_impl"
    )
