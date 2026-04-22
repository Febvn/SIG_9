from fpdf import FPDF
import os

class MY_PDF(FPDF):
    def header(self):
        self.set_font('Helvetica', 'B', 12)
        self.cell(0, 10, 'LAPORAN PRAKTIKUM SIG - Pertemuan 9', 0, 1, 'C')
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font('Helvetica', 'I', 8)
        self.cell(0, 10, f'Halaman {self.page_no()}', 0, 0, 'C')

def create_pdf(text_file, output_pdf):
    pdf = MY_PDF()
    pdf.add_page()
    pdf.set_font("Helvetica", size=11)
    
    with open(text_file, 'r', encoding='latin-1', errors='replace') as f:
        for line in f:
            # Handle UTF-8 bullets or symbols if any by replacing them
            clean_line = line.replace('\u2022', '-').replace('\u2713', '[V]')
            pdf.multi_cell(0, 7, txt=clean_line, align='L')
            
    pdf.output(output_pdf)
    print(f"PDF created: {output_pdf}")

if __name__ == "__main__":
    txt_path = r"c:\Users\muham\OneDrive\Pictures\SIG_7\Laporan_Praktikum9_WebGIS.txt"
    pdf_path = r"c:\Users\muham\OneDrive\Pictures\SIG_7\Laporan_Praktikum9_WebGIS.pdf"
    create_pdf(txt_path, pdf_path)
