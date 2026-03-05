"""PDF generation service using ReportLab."""
from io import BytesIO
from decimal import Decimal
from datetime import datetime
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    Image, HRFlowable
)
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.pdfgen import canvas
import qrcode
import base64
import json
from types import SimpleNamespace

from app.database.models import Invoice, Company, Customer, INDIAN_STATE_CODES


class PDFService:
    """Service for generating PDF invoices."""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Setup custom paragraph styles."""
        self.styles.add(ParagraphStyle(
            name='InvoiceTitle',
            parent=self.styles['Heading1'],
            fontSize=18,
            alignment=TA_CENTER,
            spaceAfter=10,
            textColor=colors.HexColor('#1a365d')
        ))
        
        self.styles.add(ParagraphStyle(
            name='CompanyName',
            parent=self.styles['Heading2'],
            fontSize=14,
            alignment=TA_CENTER,
            spaceAfter=5,
            textColor=colors.HexColor('#2d3748')
        ))
        
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading3'],
            fontSize=10,
            spaceBefore=10,
            spaceAfter=5,
            textColor=colors.HexColor('#4a5568')
        ))
        
        self.styles.add(ParagraphStyle(
            name='SmallText',
            parent=self.styles['Normal'],
            fontSize=8,
            textColor=colors.HexColor('#718096')
        ))
        
        self.styles.add(ParagraphStyle(
            name='TableHeader',
            parent=self.styles['Normal'],
            fontSize=9,
            alignment=TA_CENTER,
            textColor=colors.white
        ))
        
        self.styles.add(ParagraphStyle(
            name='AmountRight',
            parent=self.styles['Normal'],
            fontSize=10,
            alignment=TA_RIGHT
        ))
    
    def _number_to_words(self, num: Decimal) -> str:
        """Convert number to words (Indian format)."""
        ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
                'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
                'Seventeen', 'Eighteen', 'Nineteen']
        tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
        
        def two_digit(n):
            if n < 20:
                return ones[n]
            return tens[n // 10] + ('' if n % 10 == 0 else ' ' + ones[n % 10])
        
        def three_digit(n):
            if n < 100:
                return two_digit(n)
            return ones[n // 100] + ' Hundred' + ('' if n % 100 == 0 else ' and ' + two_digit(n % 100))
        
        num = int(num)
        if num == 0:
            return 'Zero'
        
        crore = num // 10000000
        num %= 10000000
        lakh = num // 100000
        num %= 100000
        thousand = num // 1000
        num %= 1000
        hundred = num
        
        result = []
        if crore:
            result.append(three_digit(crore) + ' Crore')
        if lakh:
            result.append(two_digit(lakh) + ' Lakh')
        if thousand:
            result.append(two_digit(thousand) + ' Thousand')
        if hundred:
            result.append(three_digit(hundred))
        
        return ' '.join(result) + ' Rupees Only'
    
    def _generate_qr_image(self, data: str) -> BytesIO:
        """Generate QR code image."""
        qr = qrcode.QRCode(version=1, box_size=6, border=2)
        qr.add_data(data)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        return buffer
    
    def generate_invoice_pdf(
        self,
        invoice: Invoice,
        company: Company,
        customer: Customer = None
    ) -> BytesIO:
        """Generate invoice PDF in SAPL-like boxed format."""
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=8 * mm,
            leftMargin=8 * mm,
            topMargin=8 * mm,
            bottomMargin=10 * mm
        )

        elements = []
        normal = ParagraphStyle('InvNormal', parent=self.styles['Normal'], fontSize=8, leading=9)
        normal_b = ParagraphStyle('InvBold', parent=normal, fontName='Helvetica-Bold')
        center_b = ParagraphStyle('InvCenterBold', parent=normal_b, alignment=TA_CENTER)
        right_b = ParagraphStyle('InvRightBold', parent=normal_b, alignment=TA_RIGHT)
        right_n = ParagraphStyle('InvRight', parent=normal, alignment=TA_RIGHT)
        model_wrap = ParagraphStyle('InvModelWrap', parent=normal, fontSize=7.5, leading=8, wordWrap='CJK')
        desc_wrap = ParagraphStyle('InvDescWrap', parent=normal, fontSize=7.5, leading=8, wordWrap='CJK')

        def p(value, style=normal):
            return Paragraph(value or "", style)

        def fmt_dt(value):
            return value.strftime('%d-%m-%Y') if value else ""

        def fmt_num(value):
            return f"{Decimal(value or 0):,.2f}"

        def fmt_signed(value):
            amount = Decimal(value or 0)
            sign = "+" if amount >= 0 else "-"
            return f"{sign}{abs(amount):,.2f}"

        notes_text = invoice.notes or ""
        marker_source = notes_text
        if getattr(invoice, "other_references", None):
            marker_source = f"{marker_source}\n{invoice.other_references}"
        notes_for_display = notes_text
        converted_other_charges = []
        marker = "[OTHER_CHARGES_JSON]"

        def strip_other_charges_marker(text_value):
            """Remove embedded OTHER_CHARGES marker payload from display fields."""
            if not text_value:
                return text_value
            text_value = str(text_value)
            if marker in text_value:
                return text_value.split(marker, 1)[0].strip() or None
            return text_value

        other_references_for_display = strip_other_charges_marker(
            getattr(invoice, "other_references", None)
        )

        if marker in marker_source:
            before, after = marker_source.split(marker, 1)
            notes_for_display = before.strip()
            try:
                parsed = json.loads(after.strip() or "[]")
                if isinstance(parsed, list):
                    converted_other_charges = parsed
            except Exception:
                converted_other_charges = []
        print(
            "[Invoice PDF] Parsed OTHER_CHARGES_JSON:",
            {"invoice_id": getattr(invoice, "id", None), "count": len(converted_other_charges)},
        )

        def label_val(label, value):
            return f"<b>{label}</b><br/>{value or '-'}"

        company_name = company.name or ""
        company_address = ", ".join([x for x in [
            company.address_line1,
            company.address_line2,
            company.city,
            company.state,
            company.pincode
        ] if x])

        customer_name = (
            (customer.name if customer else None)
            or invoice.customer_name
            or "Walk-in Customer"
        )
        customer_address = ""
        if customer:
            # Prefer full billing address text when available, then supplement with missing parts.
            billing_parts = []
            if getattr(customer, "billing_address", None):
                billing_parts.append(str(customer.billing_address).strip())
            for field in (
                "billing_address_line1",
                "billing_address_line2",
                "billing_city",
                "billing_state",
                "billing_zip",
            ):
                value = getattr(customer, field, None)
                if value:
                    value_text = str(value).strip()
                    if value_text and value_text not in billing_parts:
                        billing_parts.append(value_text)

            billing_country = getattr(customer, "billing_country", None)
            if billing_country and str(billing_country).strip() != "India":
                billing_parts.append(str(billing_country).strip())

            # If billing is empty, use shipping details as fallback.
            if not billing_parts:
                shipping_parts = []
                if getattr(customer, "shipping_address", None):
                    shipping_parts.append(str(customer.shipping_address).strip())
                for field in (
                    "shipping_address_line1",
                    "shipping_address_line2",
                    "shipping_city",
                    "shipping_state",
                    "shipping_zip",
                ):
                    value = getattr(customer, field, None)
                    if value:
                        value_text = str(value).strip()
                        if value_text and value_text not in shipping_parts:
                            shipping_parts.append(value_text)

                shipping_country = getattr(customer, "shipping_country", None)
                if shipping_country and str(shipping_country).strip() != "India":
                    shipping_parts.append(str(shipping_country).strip())

                customer_address = ", ".join([x for x in shipping_parts if x])
            else:
                customer_address = ", ".join([x for x in billing_parts if x])
        customer_gstin = (
            (customer.gstin if customer else None)
            or invoice.customer_gstin
            or "-"
        )

        title_table = Table(
            [[p("<b>TAX INVOICE</b>", center_b), p("<i>(ORIGINAL FOR RECIPIENT)</i>", right_n)]],
            colWidths=[150 * mm, 44 * mm]
        )
        title_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (0, 0), (0, 0), 'CENTER'),
            ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
        ]))
        elements.append(title_table)

        seller_details = p(
            f"<b>{company_name}</b><br/>"
            f"Address : {company_address or '-'}<br/>"
            f"Mobile : {company.phone or '-'}<br/>"
            f"Email : {company.email or '-'}<br/>"
            f"GST Number : {company.gstin or '-'}",
            normal
        )

        logo_path = Path("frontend/public/images/logo/savantec_logo.png")
        if logo_path.exists():
            logo_image = Image(str(logo_path), width=30 * mm, height=9 * mm)
            seller_block = Table([[logo_image, seller_details]], colWidths=[32 * mm, 76 * mm])
            seller_block.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                ('TOPPADDING', (0, 0), (-1, -1), 0),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ]))
        else:
            seller_block = seller_details

        top_right = Table([
            [p(label_val("Invoice No.", invoice.invoice_number)), p(label_val("Dated", fmt_dt(invoice.invoice_date)))],
            [p(label_val("Delivery Note", invoice.delivery_note)), p(label_val("Mode/Terms of Payment", invoice.payment_terms or "15 DAYS"))],
            [p(label_val("Supplier's Ref.", invoice.supplier_ref)), p(label_val("Other Reference(s)", other_references_for_display))],
        ], colWidths=[43 * mm, 43 * mm])
        top_right.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.8, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 2),
            ('RIGHTPADDING', (0, 0), (-1, -1), 2),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))

        top_info = Table([[seller_block, top_right]], colWidths=[108 * mm, 86 * mm])
        top_info.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.8, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('RIGHTPADDING', (0, 0), (-1, -1), 3),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        elements.append(top_info)

        consignee = p(
            f"<b>Consignee</b><br/>"
            f"<b>{customer_name}</b><br/>"
            f"{customer_address or '-'}<br/>"
            f"GSTIN : {customer_gstin}",
            normal
        )
        buyer = p(
            f"<b>Buyer (if other than consignee)</b><br/>"
            f"<b>{customer_name}</b><br/>"
            f"{customer_address or '-'}<br/>"
            f"GSTIN : {customer_gstin}",
            normal
        )

        dispatch_right = Table([
            [p(label_val("Buyer's Order No.", invoice.buyer_order_no)), p(label_val("Dated", fmt_dt(invoice.buyer_order_date)))],
            [p(label_val("Despatch Document No.", invoice.despatch_doc_no)), p(label_val("Delivery Note Date", fmt_dt(invoice.delivery_note_date)))],
            [p(label_val("Despatched through", invoice.despatched_through)), p(label_val("Destination", invoice.destination))],
        ], colWidths=[43 * mm, 43 * mm])
        dispatch_right.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.8, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 2),
            ('RIGHTPADDING', (0, 0), (-1, -1), 2),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))

        terms_block = p(f"<b>Terms Of Delivery</b><br/>{invoice.terms_of_delivery or '-'}", normal)
        party_block = Table([[consignee, dispatch_right], [buyer, terms_block]], colWidths=[108 * mm, 86 * mm])
        party_block.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.8, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('RIGHTPADDING', (0, 0), (-1, -1), 3),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))
        elements.append(party_block)

        item_headers = ['SL#', 'Model', 'Description', 'HSN/SAC', 'Qty', 'Rate', 'Discount %', 'Amount']
        # Match full section width (194mm) like other boxed sections.
        item_widths = [12 * mm, 23 * mm, 53 * mm, 23 * mm, 16 * mm, 21 * mm, 23 * mm, 23 * mm]
        item_rows = [item_headers]

        qty_total = Decimal('0')
        for idx, item in enumerate(invoice.items, 1):
            qty = Decimal(item.quantity or 0)
            qty_total += qty
            model_name = (
                getattr(item, "item_name", None)
                or getattr(item, "name", None)
                or (getattr(item, "product", None) and getattr(item.product, "name", None))
                or item.description
                or "-"
            )

            item_rows.append([
                str(idx),
                Paragraph(escape(str(model_name)), model_wrap),
                Paragraph(escape(str(item.description or '-')), desc_wrap),
                getattr(item, "hsn_code", None) or '-',
                f"{qty:,.2f} {(getattr(item, 'unit', '') or '').upper()}".strip(),
                fmt_num(item.unit_price),
                f"{Decimal(item.discount_percent or 0):.0f}%",
                fmt_num(item.total_amount),
            ])

        min_lines = 8
        while len(item_rows) - 1 < min_lines:
            item_rows.append(['', '', '', '', '', '', '', ''])

        item_rows.append([
            '',
            '',
            'Total',
            '',
            f"{qty_total:,.2f} NOS",
            fmt_num(invoice.subtotal),
            '',
            fmt_num(invoice.subtotal),
        ])

        items_table = Table(item_rows, colWidths=item_widths, repeatRows=1)
        item_style = [
            ('BOX', (0, 0), (-1, -1), 0.8, colors.black),
            ('LINEBELOW', (0, 0), (-1, 0), 0.8, colors.black),
            ('LINEABOVE', (0, -1), (-1, -1), 0.8, colors.black),
            ('LINEBELOW', (0, -1), (-1, -1), 0.8, colors.black),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('ALIGN', (0, 1), (0, -1), 'CENTER'),
            ('ALIGN', (1, 1), (3, -1), 'LEFT'),
            ('ALIGN', (4, 1), (-1, -1), 'RIGHT'),
            ('FONTSIZE', (0, 0), (-1, -1), 7.5),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('LEFTPADDING', (0, 0), (-1, -1), 2),
            ('RIGHTPADDING', (0, 0), (-1, -1), 2),
        ]
        for col in range(len(item_headers) - 1):
            item_style.append(('LINEAFTER', (col, 0), (col, -1), 0.8, colors.black))
        items_table.setStyle(TableStyle(item_style))
        elements.append(items_table)

        # Keep totals summary aligned with UI cards shown in purchase screens.
        subtotal_val = Decimal(getattr(invoice, "subtotal", 0) or 0)
        freight_val = Decimal(getattr(invoice, "freight_charges", 0) or 0)
        pf_val = Decimal(getattr(invoice, "packing_forwarding_charges", 0) or 0)
        total_tax_val = Decimal(getattr(invoice, "total_tax", 0) or 0)
        discount_all_val = Decimal(getattr(invoice, "discount_on_all", 0) or 0)
        round_off_val = Decimal(getattr(invoice, "round_off", 0) or 0)
        grand_total_val = Decimal(getattr(invoice, "total_amount", 0) or 0)

        currency_code_raw = str(getattr(invoice, "payment_type", "INR") or "INR").strip().upper()
        is_currency_code = len(currency_code_raw) == 3 and currency_code_raw.isalpha()
        currency_code = currency_code_raw if is_currency_code else "INR"
        exchange_rate_val = Decimal(str(getattr(invoice, "exchange_rate", 1) or 1))
        total_in_inr_val = grand_total_val if currency_code == "INR" else (grand_total_val * exchange_rate_val)

        totals_rows = [
            [p("<b>Subtotal :</b>", right_b), p(fmt_num(subtotal_val), right_b)],
            [p("<b>Freight Charges :</b>", right_b), p(fmt_num(freight_val), right_b)],
            [p("<b>P &amp; F Charges :</b>", right_b), p(fmt_num(pf_val), right_b)],
            [p("<b>Tax :</b>", right_b), p(fmt_num(total_tax_val), right_b)],
            [p("<b>Discount on All :</b>", right_b), p(f"-{fmt_num(abs(discount_all_val))}", right_b)],
        ]
        # Keep split other charges as individual summary rows in saved order.
        if isinstance(converted_other_charges, list) and len(converted_other_charges) > 0:
            for charge in converted_other_charges:
                name = str((charge or {}).get("name") or "Other Charges").strip() or "Other Charges"
                amount = Decimal(str((charge or {}).get("amount") or 0))
                if amount <= 0:
                    continue
                totals_rows.append([p(f"<b>{escape(name)} :</b>", right_b), p(fmt_num(amount), right_b)])
        totals_rows.extend([
            [p("<b>Round Off :</b>", right_b), p(fmt_signed(round_off_val), right_b)],
            [p("<b>Grand Total :</b>", right_b), p(fmt_num(grand_total_val), right_b)],
            [p("<b>Total in INR :</b>", right_b), p(fmt_num(total_in_inr_val), right_b)],
        ])

        totals_box = Table(totals_rows, colWidths=[32 * mm, 22 * mm])
        totals_box.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.8, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('LEFTPADDING', (0, 0), (-1, -1), 2),
            ('RIGHTPADDING', (0, 0), (-1, -1), 2),
        ]))

        words = self._number_to_words(Decimal(invoice.total_amount or 0))
        amount_words = Table([
            [p(f"<b>Amount Chargeable (in words)</b><br/>{words}", normal), totals_box]
        ], colWidths=[140 * mm, 54 * mm])
        amount_words.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.8, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('RIGHTPADDING', (0, 0), (-1, -1), 3),
        ]))
        elements.append(amount_words)

        # GST breakup section for verification (matches reference style intent).
        taxable_base = Decimal(invoice.subtotal or 0)
        gst_rows = [[
            p("<b>Tax Type</b>", center_b),
            p("<b>Rate</b>", center_b),
            p("<b>Taxable Amount</b>", center_b),
            p("<b>Tax Amount</b>", center_b),
        ]]
        if Decimal(invoice.cgst_amount or 0) > 0:
            cgst_rate = (Decimal(invoice.cgst_amount or 0) * Decimal("100") / taxable_base) if taxable_base > 0 else Decimal("0")
            gst_rows.append([
                p("CGST", normal),
                p(f"{cgst_rate:.2f}%", right_n),
                p(fmt_num(invoice.subtotal), right_n),
                p(fmt_num(invoice.cgst_amount), right_n),
            ])
        if Decimal(invoice.sgst_amount or 0) > 0:
            sgst_rate = (Decimal(invoice.sgst_amount or 0) * Decimal("100") / taxable_base) if taxable_base > 0 else Decimal("0")
            gst_rows.append([
                p("SGST", normal),
                p(f"{sgst_rate:.2f}%", right_n),
                p(fmt_num(invoice.subtotal), right_n),
                p(fmt_num(invoice.sgst_amount), right_n),
            ])
        if Decimal(invoice.igst_amount or 0) > 0:
            igst_rate = (Decimal(invoice.igst_amount or 0) * Decimal("100") / taxable_base) if taxable_base > 0 else Decimal("0")
            gst_rows.append([
                p("IGST", normal),
                p(f"{igst_rate:.2f}%", right_n),
                p(fmt_num(invoice.subtotal), right_n),
                p(fmt_num(invoice.igst_amount), right_n),
            ])
        if len(gst_rows) == 1:
            gst_rows.append([
                p("GST", normal),
                p("-", right_n),
                p(fmt_num(invoice.subtotal), right_n),
                p(fmt_num(invoice.total_tax), right_n),
            ])

        gst_summary = Table(gst_rows, colWidths=[38 * mm, 28 * mm, 64 * mm, 64 * mm])
        gst_summary.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.8, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('RIGHTPADDING', (0, 0), (-1, -1), 3),
        ]))
        elements.append(gst_summary)

        bank_text = "-"
        bank_accounts = getattr(company, "bank_accounts", None) or []
        if bank_accounts:
            default_bank = next((b for b in bank_accounts if getattr(b, "is_default", False)), bank_accounts[0])
            bank_lines = [
                f"Bank Name : {getattr(default_bank, 'bank_name', '-') or '-'}",
                f"Account Name : {getattr(default_bank, 'account_name', '-') or '-'}",
                f"A/C No : {getattr(default_bank, 'account_number', '-') or '-'}",
                f"IFSC : {getattr(default_bank, 'ifsc_code', '-') or '-'}",
            ]
            if getattr(default_bank, "upi_id", None):
                bank_lines.append(f"UPI : {default_bank.upi_id}")
            bank_text = "<br/>".join(bank_lines)

        terms_text = invoice.terms or getattr(company, "invoice_terms", None) or "-"
        if notes_for_display:
            terms_text = f"{terms_text}<br/><br/><b>Notes:</b><br/>{notes_for_display}"

        extra_info = Table([
            [
                p(f"<b>Company Bank Details</b><br/>{bank_text}", normal),
                p(f"<b>Terms & Conditions</b><br/>{terms_text}", normal),
            ]
        ], colWidths=[97 * mm, 97 * mm])
        extra_info.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.8, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('RIGHTPADDING', (0, 0), (-1, -1), 3),
        ]))
        elements.append(extra_info)

        declaration = Table([
            [p("<b>Declaration</b><br/>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.", normal)]
        ], colWidths=[194 * mm])
        declaration.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.8, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('RIGHTPADDING', (0, 0), (-1, -1), 3),
        ]))
        elements.append(declaration)

        footer = Table([
            [p("Customer Signature", normal), p(f"For <b>{company_name}</b><br/><br/><br/>Authorized Signatory", right_n)]
        ], colWidths=[120 * mm, 74 * mm])
        footer.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.8, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('RIGHTPADDING', (0, 0), (-1, -1), 3),
        ]))
        elements.append(footer)

        doc.build(elements)
        buffer.seek(0)
        return buffer

    def generate_purchase_pdf(self, purchase, company: Company, vendor=None) -> BytesIO:
        """Generate purchase invoice PDF using the same invoice layout."""
        def to_decimal(value):
            try:
                return Decimal(str(value or 0))
            except Exception:
                return Decimal("0")

        adapted_items = []
        for item in (getattr(purchase, "items", None) or []):
            adapted_items.append(
                SimpleNamespace(
                    item_name=(
                        (getattr(item, "product", None) and getattr(item.product, "name", None))
                        or getattr(item, "description", None)
                    ),
                    description=getattr(item, "description", None),
                    hsn_code=getattr(item, "hsn_code", None),
                    quantity=to_decimal(getattr(item, "quantity", 0)),
                    unit=getattr(item, "unit", None),
                    unit_price=to_decimal(
                        getattr(item, "purchase_price", None)
                        or getattr(item, "unit_price", None)
                        or getattr(item, "rate", 0)
                    ),
                    discount_percent=to_decimal(getattr(item, "discount_percent", 0)),
                    total_amount=to_decimal(getattr(item, "total_amount", 0)),
                )
            )

        adapted_invoice = SimpleNamespace(
            invoice_number=getattr(purchase, "purchase_number", None) or getattr(purchase, "id", None) or "-",
            invoice_date=getattr(purchase, "invoice_date", None),
            delivery_note=getattr(purchase, "reference_no", None),
            payment_terms=getattr(purchase, "payment_type", None),
            payment_type=getattr(purchase, "payment_type", None),
            exchange_rate=getattr(purchase, "exchange_rate", None),
            supplier_ref=getattr(purchase, "vendor_invoice_number", None),
            other_references=getattr(purchase, "reference_no", None),
            buyer_order_no=None,
            buyer_order_date=None,
            despatch_doc_no=None,
            delivery_note_date=None,
            despatched_through=None,
            destination=None,
            terms_of_delivery=getattr(purchase, "terms", None),
            notes=getattr(purchase, "notes", None),
            terms=getattr(purchase, "terms", None),
            customer_name=getattr(vendor, "name", None),
            customer_gstin=(getattr(vendor, "gstin", None) if vendor else None),
            subtotal=to_decimal(getattr(purchase, "subtotal", 0)),
            cgst_amount=to_decimal(getattr(purchase, "cgst_amount", 0)),
            sgst_amount=to_decimal(getattr(purchase, "sgst_amount", 0)),
            igst_amount=to_decimal(getattr(purchase, "igst_amount", 0)),
            total_tax=to_decimal(getattr(purchase, "total_tax", 0)),
            freight_charges=to_decimal(getattr(purchase, "freight_charges", 0)),
            packing_forwarding_charges=to_decimal(getattr(purchase, "packing_forwarding_charges", 0)),
            discount_on_all=to_decimal(getattr(purchase, "discount_on_all", 0)),
            round_off=to_decimal(getattr(purchase, "round_off", 0)),
            total_amount=to_decimal(getattr(purchase, "total_amount", 0)),
            items=adapted_items,
        )

        return self.generate_invoice_pdf(adapted_invoice, company, vendor)

    def generate_sales_return_pdf(self, sales_return, company: Company, customer=None) -> BytesIO:
        """Generate sales return PDF using the same invoice template layout."""
        def to_decimal(value):
            try:
                return Decimal(str(value or 0))
            except Exception:
                return Decimal("0")

        adapted_items = []
        for item in (getattr(sales_return, "items", None) or []):
            adapted_items.append(
                SimpleNamespace(
                    item_name=(
                        (getattr(item, "product", None) and getattr(item.product, "name", None))
                        or getattr(item, "description", None)
                    ),
                    description=getattr(item, "description", None),
                    hsn_code=getattr(item, "hsn_code", None),
                    quantity=to_decimal(getattr(item, "quantity", 0)),
                    unit=getattr(item, "unit", None),
                    unit_price=to_decimal(getattr(item, "unit_price", 0)),
                    discount_percent=to_decimal(getattr(item, "discount_percent", 0)),
                    total_amount=to_decimal(getattr(item, "total_amount", 0)),
                )
            )

        adapted_invoice = SimpleNamespace(
            invoice_number=getattr(sales_return, "return_number", None) or getattr(sales_return, "id", None) or "-",
            invoice_date=getattr(sales_return, "return_date", None),
            delivery_note=getattr(sales_return, "reference_no", None),
            payment_terms=None,
            payment_type="INR",
            exchange_rate=1,
            supplier_ref=None,
            other_references=getattr(sales_return, "reason", None),
            buyer_order_no=None,
            buyer_order_date=None,
            despatch_doc_no=None,
            delivery_note_date=None,
            despatched_through=None,
            destination=None,
            terms_of_delivery=getattr(sales_return, "notes", None),
            notes=getattr(sales_return, "notes", None),
            terms=getattr(sales_return, "notes", None),
            customer_name=(getattr(customer, "name", None) if customer else None),
            customer_gstin=(getattr(customer, "gstin", None) if customer else None),
            subtotal=to_decimal(getattr(sales_return, "subtotal", 0)),
            cgst_amount=to_decimal(getattr(sales_return, "cgst_amount", 0)),
            sgst_amount=to_decimal(getattr(sales_return, "sgst_amount", 0)),
            igst_amount=to_decimal(getattr(sales_return, "igst_amount", 0)),
            total_tax=to_decimal(getattr(sales_return, "total_tax", 0)),
            freight_charges=to_decimal(getattr(sales_return, "freight_charges", 0)),
            packing_forwarding_charges=to_decimal(getattr(sales_return, "packing_forwarding_charges", 0)),
            discount_on_all=to_decimal(getattr(sales_return, "discount_amount", 0)),
            round_off=to_decimal(getattr(sales_return, "round_off", 0)),
            total_amount=to_decimal(getattr(sales_return, "total_amount", 0)),
            items=adapted_items,
        )

        return self.generate_invoice_pdf(adapted_invoice, company, customer)

    def generate_purchase_return_pdf(self, purchase_return, company: Company, vendor=None) -> BytesIO:
        """Generate purchase return PDF using the same invoice template layout."""
        def to_decimal(value):
            try:
                return Decimal(str(value or 0))
            except Exception:
                return Decimal("0")

        def _state_code_from_gstin(gstin_value):
            gstin_text = (str(gstin_value or "").strip())
            if len(gstin_text) >= 2 and gstin_text[:2].isdigit():
                return gstin_text[:2]
            return None

        def _resolve_state_code(explicit_code, gstin_value):
            code_text = str(explicit_code or "").strip()
            if len(code_text) >= 2 and code_text[:2].isdigit():
                return code_text[:2]
            return _state_code_from_gstin(gstin_value)

        def _state_code_from_state_name(state_name):
            if not state_name:
                return None
            target = str(state_name).strip().lower()
            if not target:
                return None
            for code, name in INDIAN_STATE_CODES.items():
                if str(name).strip().lower() == target:
                    return code
            return None

        def _state_code_from_address_text(address_text):
            if not address_text:
                return None
            hay = str(address_text).strip().lower()
            if not hay:
                return None
            for code, name in INDIAN_STATE_CODES.items():
                if str(name).strip().lower() in hay:
                    return code
            return None

        adapted_items = []
        recomputed_subtotal = Decimal("0")
        recomputed_cgst = Decimal("0")
        recomputed_sgst = Decimal("0")
        recomputed_igst = Decimal("0")

        header_cgst = to_decimal(getattr(purchase_return, "cgst_amount", 0))
        header_sgst = to_decimal(getattr(purchase_return, "sgst_amount", 0))
        header_igst = to_decimal(getattr(purchase_return, "igst_amount", 0))
        company_state_code = _resolve_state_code(
            getattr(company, "state_code", None),
            getattr(company, "gstin", None),
        )
        vendor_state_code = None
        if vendor:
            # Shipping location is primary for tax determination on purchase return.
            vendor_state_code = _state_code_from_state_name(getattr(vendor, "shipping_state", None))
            if not vendor_state_code:
                vendor_state_code = _state_code_from_address_text(getattr(vendor, "shipping_address", None))
            if not vendor_state_code:
                vendor_state_code = _state_code_from_state_name(getattr(vendor, "billing_state", None))
            if not vendor_state_code:
                vendor_state_code = _state_code_from_address_text(getattr(vendor, "billing_address", None))
            if not vendor_state_code:
                vendor_state_code = _resolve_state_code(
                    getattr(vendor, "billing_state_code", None),
                    getattr(vendor, "tax_number", None) or getattr(vendor, "gstin", None),
                )

        if company_state_code and vendor_state_code:
            prefer_igst = company_state_code != vendor_state_code
        elif header_igst > 0 and (header_cgst + header_sgst) <= 0:
            prefer_igst = True
        elif header_igst > 0 and (header_cgst + header_sgst) > 0:
            prefer_igst = header_igst >= (header_cgst + header_sgst)
        else:
            prefer_igst = False

        for item in (getattr(purchase_return, "items", None) or []):
            qty = to_decimal(getattr(item, "quantity", 0))
            unit_price = to_decimal(getattr(item, "unit_price", 0))
            discount_amount = to_decimal(getattr(item, "discount_amount", 0))
            taxable_amount = to_decimal(getattr(item, "taxable_amount", 0))
            if taxable_amount <= 0:
                taxable_amount = max((qty * unit_price) - discount_amount, Decimal("0"))

            cgst_rate = to_decimal(getattr(item, "cgst_rate", 0))
            sgst_rate = to_decimal(getattr(item, "sgst_rate", 0))
            igst_rate = to_decimal(getattr(item, "igst_rate", 0))
            gst_rate = to_decimal(getattr(item, "gst_rate", 0))
            item_total = to_decimal(getattr(item, "total_amount", 0))

            # Normalize conflicting tax rates: one document should use either
            # IGST or CGST/SGST, not all three simultaneously.
            if prefer_igst:
                if igst_rate <= 0 and (cgst_rate > 0 or sgst_rate > 0):
                    igst_rate = cgst_rate + sgst_rate
                cgst_rate = Decimal("0")
                sgst_rate = Decimal("0")
            else:
                if (cgst_rate <= 0 and sgst_rate <= 0) and igst_rate > 0:
                    cgst_rate = igst_rate / Decimal("2")
                    sgst_rate = igst_rate / Decimal("2")
                igst_rate = Decimal("0")

            if cgst_rate > 0:
                recomputed_cgst += (taxable_amount * cgst_rate / Decimal("100"))
            if sgst_rate > 0:
                recomputed_sgst += (taxable_amount * sgst_rate / Decimal("100"))
            if igst_rate > 0:
                recomputed_igst += (taxable_amount * igst_rate / Decimal("100"))

            # Fallback when only GST rate exists without explicit split.
            if cgst_rate <= 0 and sgst_rate <= 0 and igst_rate <= 0 and gst_rate > 0:
                fallback_tax = item_total - taxable_amount
                if fallback_tax <= 0:
                    fallback_tax = taxable_amount * gst_rate / Decimal("100")
                if prefer_igst:
                    recomputed_igst += fallback_tax
                else:
                    recomputed_cgst += fallback_tax / Decimal("2")
                    recomputed_sgst += fallback_tax / Decimal("2")

            recomputed_subtotal += taxable_amount

            adapted_items.append(
                SimpleNamespace(
                    item_name=(
                        (getattr(item, "product", None) and getattr(item.product, "name", None))
                        or getattr(item, "description", None)
                    ),
                    description=getattr(item, "description", None),
                    hsn_code=getattr(item, "hsn_code", None),
                    quantity=qty,
                    unit=getattr(item, "unit", None),
                    unit_price=unit_price,
                    discount_percent=to_decimal(getattr(item, "discount_percent", 0)),
                    total_amount=item_total,
                )
            )

        if recomputed_subtotal <= 0:
            recomputed_subtotal = to_decimal(getattr(purchase_return, "subtotal", 0))
        if recomputed_cgst <= 0 and recomputed_sgst <= 0 and recomputed_igst <= 0:
            recomputed_cgst = header_cgst
            recomputed_sgst = header_sgst
            recomputed_igst = header_igst
        recomputed_total_tax = recomputed_cgst + recomputed_sgst + recomputed_igst

        adapted_invoice = SimpleNamespace(
            invoice_number=getattr(purchase_return, "return_number", None) or getattr(purchase_return, "id", None) or "-",
            invoice_date=getattr(purchase_return, "return_date", None),
            delivery_note=getattr(purchase_return, "reference_no", None),
            payment_terms=None,
            payment_type="INR",
            exchange_rate=1,
            supplier_ref=None,
            other_references=getattr(purchase_return, "reason", None),
            buyer_order_no=None,
            buyer_order_date=None,
            despatch_doc_no=None,
            delivery_note_date=None,
            despatched_through=None,
            destination=None,
            terms_of_delivery=getattr(purchase_return, "notes", None),
            notes=getattr(purchase_return, "notes", None),
            terms=getattr(purchase_return, "notes", None),
            customer_name=(getattr(vendor, "name", None) if vendor else None),
            customer_gstin=(getattr(vendor, "gstin", None) if vendor else None),
            subtotal=recomputed_subtotal,
            cgst_amount=recomputed_cgst,
            sgst_amount=recomputed_sgst,
            igst_amount=recomputed_igst,
            total_tax=recomputed_total_tax,
            freight_charges=to_decimal(getattr(purchase_return, "freight_charges", 0)),
            packing_forwarding_charges=to_decimal(getattr(purchase_return, "packing_forwarding_charges", 0)),
            discount_on_all=to_decimal(getattr(purchase_return, "discount_amount", 0)),
            round_off=to_decimal(getattr(purchase_return, "round_off", 0)),
            total_amount=to_decimal(getattr(purchase_return, "total_amount", 0)),
            items=adapted_items,
        )

        return self.generate_invoice_pdf(adapted_invoice, company, vendor)

    def generate_proforma_pdf(
        self,
        proforma,
        company: Company,
        customer: Customer = None
    ) -> BytesIO:
        """Generate a basic proforma invoice PDF."""
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=15 * mm,
            leftMargin=15 * mm,
            topMargin=15 * mm,
            bottomMargin=20 * mm
        )

        elements = []

        elements.append(Paragraph("PROFORMA INVOICE", self.styles['InvoiceTitle']))
        elements.append(Spacer(1, 5))

        elements.append(Paragraph(company.name, self.styles['CompanyName']))
        elements.append(Spacer(1, 6))

        address_parts = []
        if company.address_line1:
            address_parts.append(company.address_line1)
        if company.address_line2:
            address_parts.append(company.address_line2)
        if company.city:
            city_state = company.city
            if company.state:
                city_state += f", {company.state}"
            if company.pincode:
                city_state += f" - {company.pincode}"
            address_parts.append(city_state)
        if address_parts:
            elements.append(Paragraph(
                '<br/>'.join(address_parts),
                ParagraphStyle('Address', parent=self.styles['Normal'], fontSize=9, alignment=TA_CENTER)
            ))

        contact_parts = []
        if company.phone:
            contact_parts.append(f"Phone: {company.phone}")
        if company.email:
            contact_parts.append(f"Email: {company.email}")
        if contact_parts:
            elements.append(Paragraph(
                ' | '.join(contact_parts),
                ParagraphStyle('Contact', parent=self.styles['SmallText'], alignment=TA_CENTER)
            ))

        elements.append(Spacer(1, 10))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e2e8f0')))
        elements.append(Spacer(1, 10))

        proforma_date = proforma.proforma_date.strftime('%d-%b-%Y') if proforma.proforma_date else ''
        due_date = proforma.due_date.strftime('%d-%b-%Y') if proforma.due_date else 'On Receipt'
        reference_date = proforma.reference_date.strftime('%d-%b-%Y') if proforma.reference_date else '-'

        sales_person_name = "-"
        if getattr(proforma, "sales_person", None):
            sales_person = proforma.sales_person
            sales_person_name = (
                getattr(sales_person, "full_name", None)
                or " ".join(filter(None, [getattr(sales_person, "first_name", None), getattr(sales_person, "last_name", None)]))
                or getattr(sales_person, "name", None)
                or "-"
            )

        contact_person_name = "-"
        if getattr(proforma, "contact", None):
            contact = proforma.contact
            contact_person_name = (
                getattr(contact, "name", None)
                or getattr(contact, "email", None)
                or getattr(contact, "phone", None)
                or "-"
            )

        bank_account_label = "-"
        if getattr(proforma, "bank_account", None):
            bank = proforma.bank_account
            bank_account_label = (
                f"{getattr(bank, 'bank_name', '')} - {getattr(bank, 'account_number', '')}".strip(" -")
                or getattr(bank, "account_name", None)
                or "-"
            )

        invoice_details = [
            ['Proforma No:', proforma.invoice_number],
            ['Proforma Date:', proforma_date],
            ['Due Date:', due_date],
            ['Reference:', proforma.reference_no or '-'],
            ['Reference Date:', reference_date],
            ['Sales Person:', sales_person_name],
            ['Contact Person:', contact_person_name],
            ['Bank Account:', bank_account_label],
        ]

        customer_name = customer.name if customer else "Walk-in Customer"
        customer_address = ""
        customer_state = "-"
        if customer:
            addr_parts = []
            if customer.billing_address_line1:
                addr_parts.append(customer.billing_address_line1)
            if customer.billing_address_line2:
                addr_parts.append(customer.billing_address_line2)
            if customer.billing_city:
                addr_parts.append(customer.billing_city)
            if customer.billing_state:
                addr_parts.append(customer.billing_state)
                customer_state = customer.billing_state
            if customer.billing_zip:
                addr_parts.append(customer.billing_zip)
            if customer.billing_country and customer.billing_country != "India":
                addr_parts.append(customer.billing_country)
            customer_address = ", ".join(addr_parts)

        customer_details = [
            ['Bill To:', customer_name],
            ['Address:', customer_address or '-'],
            ['State:', customer_state],
        ]

        col_width = 85 * mm
        left_table = Table(invoice_details, colWidths=[35 * mm, 50 * mm])
        left_table.setStyle(TableStyle([
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))

        right_table = Table(customer_details, colWidths=[25 * mm, 60 * mm])
        right_table.setStyle(TableStyle([
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))

        details_table = Table([[left_table, right_table]], colWidths=[col_width, col_width])
        elements.append(details_table)
        elements.append(Spacer(1, 10))

        buyer_order_date = proforma.buyer_order_date.strftime('%d-%b-%Y') if proforma.buyer_order_date else '-'
        delivery_note_date = proforma.delivery_note_date.strftime('%d-%b-%Y') if proforma.delivery_note_date else '-'
        other_details = [
            ['Delivery Note:', proforma.delivery_note or '-'],
            ["Supplier Ref:", proforma.supplier_ref or '-'],
            ["Other References:", proforma.other_references or '-'],
            ["Buyer Order No:", proforma.buyer_order_no or '-'],
            ["Buyer Order Date:", buyer_order_date],
            ["Despatch Doc No:", proforma.despatch_doc_no or '-'],
            ["Delivery Note Date:", delivery_note_date],
            ["Despatched Through:", proforma.despatched_through or '-'],
            ["Destination:", proforma.destination or '-'],
            ["Terms of Delivery:", proforma.terms_of_delivery or '-'],
        ]

        other_table = Table(other_details, colWidths=[40 * mm, 130 * mm])
        other_table.setStyle(TableStyle([
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))

        elements.append(other_table)
        elements.append(Spacer(1, 15))

        headers = ['#', 'Item Code', 'Description', 'HSN', 'Qty', 'Unit', 'Rate', 'Disc%', 'Disc Amt', 'GST%', 'Taxable', 'Total']
        col_widths = [6 * mm, 16 * mm, 40 * mm, 12 * mm, 10 * mm, 10 * mm, 14 * mm, 10 * mm, 14 * mm, 10 * mm, 18 * mm, 18 * mm]
        data = [headers]

        for idx, item in enumerate(proforma.items, 1):
            row = [
                str(idx),
                getattr(item, "item_code", None) or '-',
                (item.description or '')[:30],
                getattr(item, "hsn_code", None) or '-',
                f"{float(item.quantity):.2f}",
                getattr(item, "unit", None) or '-',
                f"₹{float(item.unit_price):,.2f}",
                f"{float(getattr(item, 'discount_percent', 0) or 0):.2f}",
                f"â‚¹{float(getattr(item, 'discount_amount', 0) or 0):,.2f}",
                f"{float(item.gst_rate):.0f}%",
                f"₹{float(item.taxable_amount):,.2f}",
                f"₹{float(item.total_amount):,.2f}",
            ]
            row[8] = f"Rs {float(getattr(item, 'discount_amount', 0) or 0):,.2f}"
            data.append(row)

        items_table = Table(data, colWidths=col_widths, repeatRows=1)
        items_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2d3748')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('ALIGN', (0, 1), (0, -1), 'CENTER'),
            ('ALIGN', (1, 1), (2, -1), 'LEFT'),
            ('ALIGN', (3, 1), (-1, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f7fafc')]),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ]))

        elements.append(items_table)
        elements.append(Spacer(1, 15))

        totals_data = [
            ['Subtotal:', f"₹{float(proforma.subtotal):,.2f}"],
            ['Total Tax:', f"₹{float(proforma.total_tax):,.2f}"],
            ['Grand Total:', f"₹{float(proforma.total_amount):,.2f}"],
        ]
        totals_data.insert(2, ['Freight Charges:', f"â‚¹{float(proforma.freight_charges or 0):,.2f}"])
        totals_data.insert(3, ['P & F Charges:', f"â‚¹{float(proforma.pf_charges or 0):,.2f}"])
        totals_data.insert(4, ['Round Off:', f"â‚¹{float(proforma.round_off or 0):,.2f}"])
        totals_data[2][1] = f"Rs {float(proforma.freight_charges or 0):,.2f}"
        totals_data[3][1] = f"Rs {float(proforma.pf_charges or 0):,.2f}"
        totals_data[4][1] = f"Rs {float(proforma.round_off or 0):,.2f}"
        totals_table = Table(totals_data, colWidths=[130 * mm, 40 * mm])
        totals_table.setStyle(TableStyle([
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('LINEABOVE', (0, -1), (-1, -1), 1, colors.HexColor('#2d3748')),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))

        elements.append(totals_table)

        if proforma.terms:
            elements.append(Spacer(1, 10))
            elements.append(Paragraph("<b>Terms & Conditions:</b>", self.styles['SectionHeader']))
            elements.append(Paragraph(proforma.terms, self.styles['SmallText']))

        if proforma.notes:
            elements.append(Spacer(1, 10))
            elements.append(Paragraph("<b>Notes:</b>", self.styles['SectionHeader']))
            elements.append(Paragraph(proforma.notes, self.styles['SmallText']))

        elements.append(Spacer(1, 20))
        elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#e2e8f0')))
        elements.append(Paragraph(
            "This is a computer-generated proforma invoice.",
            ParagraphStyle('Footer', parent=self.styles['SmallText'], alignment=TA_CENTER)
        ))

        doc.build(elements)
        buffer.seek(0)
        return buffer
    
    def generate_invoice_pdf_base64(
        self,
        invoice: Invoice,
        company: Company,
        customer: Customer = None
    ) -> str:
        """Generate invoice PDF and return as base64 string."""
        pdf_buffer = self.generate_invoice_pdf(invoice, company, customer)
        return base64.b64encode(pdf_buffer.getvalue()).decode()

