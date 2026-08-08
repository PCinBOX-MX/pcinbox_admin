"""Genera PDF del catálogo de campos para alta de licencias."""

from pathlib import Path

from fpdf import FPDF

OUTPUT = Path.home() / "Desktop" / "Catalogo-Campos-Licencias-PCInbox.pdf"
FONT = Path(r"C:\Windows\Fonts\arial.ttf")
FONT_BOLD = Path(r"C:\Windows\Fonts\arialbd.ttf")


SECTIONS = [
    {
        "title": "1. Bloque de licencia",
        "desc": "Define el tipo de producto de software.",
        "rows": [
            ("Windows", "Licencias del sistema operativo Windows."),
            ("Antivirus", "Licencias de seguridad / antivirus."),
            ("Paquetería Office", "Suites de oficina (Word, Excel, PowerPoint, etc.)."),
        ],
    },
    {
        "title": "2. Modalidad",
        "desc": "Cómo se adquiere o entrega la licencia.",
        "rows": [
            (
                "OEM",
                "Va ligada al equipo (preinstalada / con hardware). Normalmente no se reutiliza en otra máquina.",
            ),
            (
                "Retail",
                "Licencia de caja o venta al público. Más flexible para transferir o reinstalar según el fabricante.",
            ),
            (
                "ESD (entrega digital)",
                "Entrega electrónica (clave o descarga digital), sin medio físico.",
            ),
            (
                "Licenciamiento por volumen",
                "Para empresas o instituciones: muchas licencias bajo un mismo contrato.",
            ),
        ],
    },
    {
        "title": "3. Vigencia",
        "desc": "Cuánto tiempo dura el derecho de uso.",
        "rows": [
            ("Permanente", "Compra única; no vence (salvo políticas del fabricante)."),
            ("1 mes", "Suscripción o vigencia de 1 mes."),
            ("1 año", "Suscripción o vigencia anual."),
            ("2 años", "Vigencia de 2 años."),
            ("3 años", "Vigencia de 3 años."),
        ],
    },
    {
        "title": "4. Tipo de cobertura",
        "desc": "Sobre qué se cuenta la licencia.",
        "rows": [
            ("Dispositivos", "Se licencia por equipo o máquina."),
            ("Usuarios", "Se licencia por persona o cuenta."),
        ],
    },
    {
        "title": "5. Idioma",
        "desc": "Idioma del software.",
        "rows": [
            ("Español", "Interfaz en español."),
            ("Inglés", "Interfaz en inglés."),
            ("Multilenguaje", "Soporta varios idiomas."),
        ],
    },
    {
        "title": "6. Arquitectura",
        "desc": "Arquitectura compatible del sistema.",
        "rows": [
            ("32 bits", "Solo sistemas de 32 bits."),
            ("64 bits", "Solo sistemas de 64 bits."),
            ("32 y 64 bits", "Compatible con ambas arquitecturas."),
            (
                "No aplica",
                "No depende de arquitectura (común en algunos antivirus o soluciones en la nube).",
            ),
        ],
    },
    {
        "title": "7. Campos de texto (mismo bloque)",
        "desc": "No son listas desplegables, pero se capturan junto con los selects.",
        "rows": [
            (
                "Versión o edición",
                "Edición comercial del producto. Ejemplos: Home, Pro, Enterprise, Standard.",
            ),
            (
                "Cantidad de usuarios o dispositivos",
                "Número cubierto por la licencia, según el tipo de cobertura. Ejemplos: 1, 3, 5.",
            ),
        ],
    },
]


class LicenseCatalogPDF(FPDF):
    def header(self):
        self.set_font("ArialCustom", "B", 11)
        self.set_text_color(153, 34, 48)
        self.cell(0, 8, "PCInbox · Administración de productos", align="L")
        self.ln(4)
        self.set_draw_color(185, 43, 61)
        self.set_line_width(0.6)
        self.line(10, self.get_y() + 2, 200, self.get_y() + 2)
        self.ln(10)

    def footer(self):
        self.set_y(-15)
        self.set_font("ArialCustom", "", 8)
        self.set_text_color(107, 114, 128)
        self.cell(0, 10, f"Página {self.page_no()}/{{nb}}", align="C")


def draw_table(pdf: FPDF, rows: list[tuple[str, str]]):
    col_opt = 55
    col_mean = 135
    line_h = 5.2

    pdf.set_fill_color(153, 34, 48)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("ArialCustom", "B", 9)
    pdf.cell(col_opt, 8, " Opción", border=0, fill=True)
    pdf.cell(col_mean, 8, " Significado", border=0, fill=True, new_x="LMARGIN", new_y="NEXT")

    fill = False
    for option, meaning in rows:
        pdf.set_font("ArialCustom", "B", 9)
        opt_h = pdf.multi_cell(col_opt, line_h, f" {option}", border=0, dry_run=True, output="HEIGHT")
        pdf.set_font("ArialCustom", "", 9)
        mean_h = pdf.multi_cell(col_mean, line_h, f" {meaning}", border=0, dry_run=True, output="HEIGHT")
        row_h = max(opt_h, mean_h, 8)

        if pdf.get_y() + row_h > pdf.h - 20:
            pdf.add_page()
            pdf.set_fill_color(153, 34, 48)
            pdf.set_text_color(255, 255, 255)
            pdf.set_font("ArialCustom", "B", 9)
            pdf.cell(col_opt, 8, " Opción", border=0, fill=True)
            pdf.cell(col_mean, 8, " Significado", border=0, fill=True, new_x="LMARGIN", new_y="NEXT")
            fill = False

        y0 = pdf.get_y()
        x0 = pdf.get_x()
        bg = (253, 242, 244) if fill else (255, 255, 255)
        pdf.set_fill_color(*bg)
        pdf.rect(x0, y0, col_opt + col_mean, row_h, style="F")

        pdf.set_xy(x0, y0 + 1.2)
        pdf.set_text_color(55, 65, 81)
        pdf.set_font("ArialCustom", "B", 9)
        pdf.multi_cell(col_opt, line_h, f" {option}", border=0)

        pdf.set_xy(x0 + col_opt, y0 + 1.2)
        pdf.set_font("ArialCustom", "", 9)
        pdf.multi_cell(col_mean, line_h, f" {meaning}", border=0)

        pdf.set_y(y0 + row_h)
        fill = not fill


def main():
    pdf = LicenseCatalogPDF()
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_font("ArialCustom", "", str(FONT))
    pdf.add_font("ArialCustom", "B", str(FONT_BOLD))
    pdf.add_page()

    pdf.set_font("ArialCustom", "B", 18)
    pdf.set_text_color(17, 24, 39)
    pdf.multi_cell(0, 9, "Catálogo de campos para alta de licencias")
    pdf.ln(2)

    pdf.set_font("ArialCustom", "", 11)
    pdf.set_text_color(75, 85, 99)
    pdf.multi_cell(
        0,
        6,
        "Documento de referencia para el registro de licencias de Windows, Antivirus y Paquetería Office en el panel administrativo de PCInbox. Incluye cada campo solicitado en el formulario y el significado de sus opciones.",
    )
    pdf.ln(4)

    for section in SECTIONS:
        needed = 28 + (len(section["rows"]) * 10)
        if pdf.get_y() + needed > pdf.h - 20:
            pdf.add_page()

        pdf.set_font("ArialCustom", "B", 13)
        pdf.set_text_color(153, 34, 48)
        pdf.cell(0, 8, section["title"], new_x="LMARGIN", new_y="NEXT")

        pdf.set_font("ArialCustom", "", 10)
        pdf.set_text_color(75, 85, 99)
        pdf.multi_cell(0, 5, section["desc"])
        pdf.ln(1.5)

        draw_table(pdf, section["rows"])
        pdf.ln(6)

    pdf.set_draw_color(229, 231, 235)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(4)
    pdf.set_font("ArialCustom", "", 9)
    pdf.set_text_color(107, 114, 128)
    pdf.multi_cell(
        0,
        5,
        "Nota: Todos los campos del bloque de licencia son obligatorios al dar de alta un producto de tipo Licencia.",
    )

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(OUTPUT))
    print(OUTPUT)


if __name__ == "__main__":
    main()
