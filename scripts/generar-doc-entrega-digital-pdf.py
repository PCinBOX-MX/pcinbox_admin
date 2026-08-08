"""Genera PDF del plan de cambios: entrega digital de licencias."""

from pathlib import Path

from fpdf import FPDF

OUTPUT = Path.home() / "Desktop" / "Plan-Entrega-Digital-Licencias-PCInbox.pdf"
FONT = Path(r"C:\Windows\Fonts\arial.ttf")
FONT_BOLD = Path(r"C:\Windows\Fonts\arialbd.ttf")


class DocPDF(FPDF):
    def header(self):
        self.set_font("ArialCustom", "B", 11)
        self.set_text_color(153, 34, 48)
        self.cell(0, 8, "PCInbox · Especificación de cambios", align="L")
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


def h1(pdf, text):
    pdf.set_x(pdf.l_margin)
    pdf.set_font("ArialCustom", "B", 16)
    pdf.set_text_color(17, 24, 39)
    pdf.multi_cell(0, 8, text)
    pdf.ln(2)


def h2(pdf, text):
    pdf.set_x(pdf.l_margin)
    pdf.set_font("ArialCustom", "B", 12)
    pdf.set_text_color(153, 34, 48)
    pdf.multi_cell(0, 7, text)
    pdf.ln(1)


def body(pdf, text):
    pdf.set_x(pdf.l_margin)
    pdf.set_font("ArialCustom", "", 10)
    pdf.set_text_color(55, 65, 81)
    pdf.multi_cell(0, 5.5, text)
    pdf.ln(2)


def bullet(pdf, text):
    pdf.set_x(pdf.l_margin)
    pdf.set_font("ArialCustom", "", 10)
    pdf.set_text_color(55, 65, 81)
    pdf.multi_cell(0, 5.5, f"- {text}")
    pdf.set_x(pdf.l_margin)


def main():
    pdf = DocPDF()
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_font("ArialCustom", "", str(FONT))
    pdf.add_font("ArialCustom", "B", str(FONT_BOLD))
    pdf.add_page()

    h1(pdf, "Plan de cambios: entrega digital de licencias")
    body(
        pdf,
        "Documento para implementación y revisión con el equipo. Describe cómo el cliente compra licencias de Windows, Paquetería Office y Antivirus cuando la entrega es digital (clave por correo), y qué cambia en el sistema.",
    )

    h2(pdf, "1. Objetivo")
    body(
        pdf,
        "Mantener el mismo flujo de compra (catálogo → carrito → pago), pero adaptar la entrega cuando el producto es una licencia digital: no pedir envío físico ni domicilio; informar que la clave se entrega por medios digitales.",
    )

    h2(pdf, "2. Regla de negocio")
    bullet(pdf, "Si el producto tiene licenseType (windows | antivirus | office), se considera licencia digital.")
    bullet(pdf, "Si TODOS los productos de un grupo de entrega son licencias: metodo obligatorio digital (costo $0, sin domicilio).")
    bullet(pdf, "Si el grupo mezcla licencia + producto fisico: se mantiene envio/sucursal del hardware, y se avisa que las licencias van por entrega digital.")
    bullet(pdf, "Si el grupo es solo fisico: comportamiento actual sin cambios.")
    pdf.ln(2)

    h2(pdf, "3. Experiencia del cliente (pantalla por pantalla)")
    bullet(pdf, "Catalogo SOFTWARE: igual (elige Windows / Office / Antivirus).")
    bullet(pdf, "Carrito / Confirmar productos: igual.")
    bullet(pdf, "Opciones de entrega: si solo hay licencias, ve Entrega digital (sin sucursal/envio/paqueteria). Mensaje: la clave se enviara al correo de la cuenta tras el pago.")
    bullet(pdf, "Forma de pago: igual.")
    bullet(pdf, "Resumen / pago: envio $0 para grupos digitales.")
    bullet(pdf, "Despues del pago (operacion): el equipo asigna/envia la clave y marca entregado (automatizacion de claves en una fase posterior).")
    pdf.ln(2)

    h2(pdf, "4. Cambios tecnicos por repositorio")
    body(pdf, "pcinbox-client")
    bullet(pdf, "Utilidad isDigitalLicenseProduct / isDigitalOnlyGroup.")
    bullet(pdf, "Opciones de entrega: UI y auto-seleccion del metodo digital.")
    bullet(pdf, "Validaciones: no exigir domicilio ni seguro para digital.")
    bullet(pdf, "Etiquetas en resumen/detalle: Entrega digital.")
    pdf.ln(1)
    body(pdf, "pcinbox-server")
    bullet(pdf, "Incluir licenseType en el modelo products (columna ya existente en BD compartida).")
    bullet(pdf, "Cart/checkout: propagar licenseType.")
    bullet(pdf, "Calculo de costos: shipping_method = digital => $0.")
    pdf.ln(1)
    body(pdf, "server-pasarela-de-pagos")
    bullet(pdf, "Incluir licenseType en products.")
    bullet(pdf, "Aceptar metodo digital en validacion de entrega y cotizacion ($0, sin direccion).")
    bullet(pdf, "Elegibilidad de metodos: grupo solo-licencias => solo digital disponible.")
    pdf.ln(1)
    body(pdf, "pcinbox_admin / server-proveedores")
    bullet(pdf, "Sin cambio obligatorio en esta fase (el alta de licencias ya existe).")
    bullet(pdf, "Fase 2 sugerida: inventario de claves y envio automatico post-pago.")
    pdf.ln(2)

    h2(pdf, "5. Que NO entra en esta fase")
    bullet(pdf, "Boveda/inventario de claves de activacion.")
    bullet(pdf, "Envio automatico de la clave por correo.")
    bullet(pdf, "Portal del cliente para ver claves de pedidos anteriores.")
    body(
        pdf,
        "Esas piezas se documentan como fase 2. En fase 1, la operacion puede entregar la clave manualmente tras confirmar el pago.",
    )

    h2(pdf, "6. Criterios de aceptacion")
    bullet(pdf, "Carrito solo con licencia(s): no pide domicilio; metodo digital; envio $0; puede pagar.")
    bullet(pdf, "Carrito solo fisico: flujo identico al actual.")
    bullet(pdf, "Carrito mixto (RAM + Windows): pide entrega del hardware; muestra aviso de entrega digital para la licencia.")
    bullet(pdf, "Resumen/detalle muestran Entrega digital cuando aplica.")
    pdf.ln(2)

    h2(pdf, "7. Riesgos y notas")
    bullet(pdf, "Depende de que licenseType viaje desde BD -> cart -> checkout (por eso se actualiza Prisma en server y pasarela).")
    bullet(pdf, "Hasta fase 2, el SLA de entrega de clave es operativo (humano), no automatico.")
    bullet(pdf, "OEM/caja fisica: si en el futuro se venden unidades fisicas, se podria distinguir por modalidad; hoy licenseType implica flujo digital.")

    pdf.output(str(OUTPUT))
    print(OUTPUT)


if __name__ == "__main__":
    main()
