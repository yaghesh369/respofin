from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.http import HttpResponse
import datetime
from io import BytesIO

from .services import full_analytics


class AnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        include_timeline_raw = str(
            request.query_params.get("include_timeline", "true")
        ).strip().lower()
        include_timeline = include_timeline_raw not in {"0", "false", "no"}

        data = full_analytics(request.user, include_timeline=include_timeline)
        return Response(data)



class AnalyticsPDFView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        data = full_analytics(request.user, include_timeline=False)

        try:
            from reportlab.platypus import (
                SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable,
            )
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.units import cm
            from reportlab.lib import colors
            from reportlab.lib.enums import TA_CENTER
            from reportlab.graphics.shapes import Drawing
            from reportlab.graphics.charts.barcharts import VerticalBarChart
            from reportlab.graphics.charts.piecharts import Pie
        except ImportError:
            return Response({"detail": "PDF export requires reportlab package."}, status=400)

        # ── Palette ──────────────────────────────────────────────────────────
        C_HEADER     = colors.HexColor('#0f172a')
        C_HEADER_TXT = colors.white
        C_ROW_ALT    = colors.HexColor('#f8fafc')
        C_BORDER     = colors.HexColor('#e2e8f0')
        C_TEAL       = colors.HexColor('#0d9488')
        C_INDIGO     = colors.HexColor('#6366f1')
        C_EMERALD    = colors.HexColor('#10b981')
        C_AMBER      = colors.HexColor('#f59e0b')
        C_ROSE       = colors.HexColor('#ef4444')
        C_PURPLE     = colors.HexColor('#8b5cf6')
        C_CYAN       = colors.HexColor('#0ea5e9')
        C_MUTED      = colors.HexColor('#64748b')
        SEG_COLORS   = [C_INDIGO, C_CYAN, C_EMERALD, C_AMBER, C_ROSE, C_PURPLE]

        # ── Paragraph styles ─────────────────────────────────────────────────
        base = getSampleStyleSheet()
        s_title  = ParagraphStyle('rTitle',  parent=base['Title'],
                                  fontSize=22, spaceAfter=4, textColor=C_HEADER)
        s_h2     = ParagraphStyle('rH2',     parent=base['Heading2'],
                                  fontSize=12, spaceBefore=16, spaceAfter=6,
                                  textColor=C_HEADER)
        s_meta   = ParagraphStyle('rMeta',   parent=base['Normal'],
                                  fontSize=9,  textColor=C_MUTED, spaceAfter=2)
        s_footer = ParagraphStyle('rFooter', parent=s_meta, alignment=TA_CENTER)

        # ── Reusable table builder ────────────────────────────────────────────
        def styled_table(rows, col_widths):
            ts = [
                ('BACKGROUND',   (0, 0), (-1, 0),  C_HEADER),
                ('TEXTCOLOR',    (0, 0), (-1, 0),  C_HEADER_TXT),
                ('FONTNAME',     (0, 0), (-1, 0),  'Helvetica-Bold'),
                ('FONTSIZE',     (0, 0), (-1, 0),  9),
                ('ALIGN',        (0, 0), (-1, 0),  'CENTER'),
                ('FONTSIZE',     (0, 1), (-1, -1), 8.5),
                ('GRID',         (0, 0), (-1, -1), 0.35, C_BORDER),
                ('VALIGN',       (0, 0), (-1, -1), 'MIDDLE'),
                ('TOPPADDING',   (0, 0), (-1, -1), 5),
                ('BOTTOMPADDING',(0, 0), (-1, -1), 5),
                ('LEFTPADDING',  (0, 0), (-1, -1), 8),
                ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ]
            for i in range(1, len(rows)):
                if i % 2 == 0:
                    ts.append(('BACKGROUND', (0, i), (-1, i), C_ROW_ALT))
            t = Table(rows, colWidths=col_widths)
            t.setStyle(TableStyle(ts))
            return t

        # ── Data shortcuts ────────────────────────────────────────────────────
        c    = data['customers']
        n    = data['notifications']
        r    = data['recommendations']
        segs = data['segments']
        rbs  = r.get('by_segment', [])
        top  = r.get('top_products', [])

        notif_total       = n['draft'] + n['sent'] + n['failed']
        deliv_attempts    = n['sent'] + n['failed']
        delivery_rate     = round(n['sent'] / deliv_attempts * 100, 1) if deliv_attempts else 0.0
        seg_customers     = sum(s['count'] for s in segs)
        seg_coverage      = round(seg_customers / c['total'] * 100, 1) if c['total'] else 0.0
        rec_coverage      = round(r['total'] / c['total'] * 100, 1)    if c['total'] else 0.0
        user_label        = getattr(request.user, 'email', str(request.user))

        # ── Document ─────────────────────────────────────────────────────────
        W  = 17 * cm          # usable page width (A4 minus margins)
        buf = BytesIO()
        doc = SimpleDocTemplate(
            buf,
            leftMargin=1.8*cm, rightMargin=1.8*cm,
            topMargin=1.8*cm,  bottomMargin=1.8*cm,
        )
        story = []

        # Title block
        story.append(Paragraph("Customer Analytics Report", s_title))
        story.append(Paragraph(
            f"Generated {datetime.datetime.now().strftime('%B %d, %Y at %H:%M')}  ·  {user_label}",
            s_meta,
        ))
        story.append(HRFlowable(width='100%', thickness=1.5, color=C_TEAL,
                                spaceAfter=14, spaceBefore=6))

        # ── Summary metrics ───────────────────────────────────────────────────
        story.append(Paragraph("Summary Metrics", s_h2))
        sum_rows = [
            ['Metric', 'Value', 'Metric', 'Value'],
            ['Total customers',         str(c['total']),       'Active customers',   str(c['active'])],
            ['Inactive customers',      str(c['inactive']),    'Segment buckets',    str(len(segs))],
            ['Total recommendations',   str(r['total']),       'Notifications sent', str(n['sent'])],
            ['Notifications failed',    str(n['failed']),      'Drafts pending',     str(n['draft'])],
            ['Delivery rate',           f"{delivery_rate}%",   'Segm. coverage',     f"{seg_coverage}%"],
            ['Rec. coverage',           f"{rec_coverage}%",    'Segmented customers',str(seg_customers)],
        ]
        sum_ts = [
            ('BACKGROUND',   (0, 0), (-1, 0),  C_HEADER),
            ('TEXTCOLOR',    (0, 0), (-1, 0),  C_HEADER_TXT),
            ('FONTNAME',     (0, 0), (-1, 0),  'Helvetica-Bold'),
            ('FONTSIZE',     (0, 0), (-1, 0),  9),
            ('FONTNAME',     (0, 1), (0,  -1), 'Helvetica-Bold'),
            ('FONTNAME',     (2, 1), (2,  -1), 'Helvetica-Bold'),
            ('FONTSIZE',     (0, 1), (-1, -1), 8.5),
            ('GRID',         (0, 0), (-1, -1), 0.35, C_BORDER),
            ('VALIGN',       (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING',   (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING',(0, 0), (-1, -1), 5),
            ('LEFTPADDING',  (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('ALIGN',        (1, 1), (1,  -1), 'CENTER'),
            ('ALIGN',        (3, 1), (3,  -1), 'CENTER'),
            ('TEXTCOLOR',    (1, 1), (1,  -1), C_TEAL),
            ('TEXTCOLOR',    (3, 1), (3,  -1), C_INDIGO),
            ('FONTNAME',     (1, 1), (1,  -1), 'Helvetica-Bold'),
            ('FONTNAME',     (3, 1), (3,  -1), 'Helvetica-Bold'),
        ]
        for i in range(1, len(sum_rows)):
            if i % 2 == 0:
                sum_ts.append(('BACKGROUND', (0, i), (-1, i), C_ROW_ALT))
        st = Table(sum_rows, colWidths=[W*0.35, W*0.15, W*0.35, W*0.15])
        st.setStyle(TableStyle(sum_ts))
        story.append(st)

        # ── Segment distribution ──────────────────────────────────────────────
        if segs:
            story.append(Paragraph("Segment Distribution", s_h2))
            seg_rows = [['Segment', 'Customers', 'Coverage']]
            for s in segs:
                seg_rows.append([f"Segment {s['segment_label']}", str(s['count']), f"{s['percentage']}%"])
            story.append(styled_table(seg_rows, [W*0.45, W*0.275, W*0.275]))

            if seg_customers > 0:
                story.append(Spacer(1, 10))
                d = Drawing(W, 200)
                pie = Pie()
                pie.x      = int(W/2) - 75
                pie.y      = 25
                pie.width  = 150
                pie.height = 150
                pie.data   = [s['count'] for s in segs]
                pie.labels = [f"Seg {s['segment_label']} ({s['percentage']}%)" for s in segs]
                pie.sideLabels       = True
                pie.sideLabelsOffset = 0.1
                for i in range(len(segs)):
                    pie.slices[i].fillColor   = SEG_COLORS[i % len(SEG_COLORS)]
                    pie.slices[i].strokeColor = colors.white
                    pie.slices[i].strokeWidth = 1.5
                d.add(pie)
                story.append(d)

        # ── Notification performance ──────────────────────────────────────────
        story.append(Paragraph("Notification Performance", s_h2))
        nt_rows = [['Status', 'Count', 'Share']]
        if notif_total:
            nt_rows += [
                ['Draft',  str(n['draft']),  f"{round(n['draft']  / notif_total * 100, 1)}%"],
                ['Sent',   str(n['sent']),   f"{round(n['sent']   / notif_total * 100, 1)}%"],
                ['Failed', str(n['failed']), f"{round(n['failed'] / notif_total * 100, 1)}%"],
            ]
        else:
            nt_rows += [['Draft','0','0%'], ['Sent','0','0%'], ['Failed','0','0%']]
        nt_ts = [
            ('BACKGROUND',   (0, 0), (-1, 0),  C_HEADER),
            ('TEXTCOLOR',    (0, 0), (-1, 0),  C_HEADER_TXT),
            ('FONTNAME',     (0, 0), (-1, 0),  'Helvetica-Bold'),
            ('FONTSIZE',     (0, 0), (-1, 0),  9),
            ('FONTSIZE',     (0, 1), (-1, -1), 8.5),
            ('FONTNAME',     (0, 1), (-1, -1), 'Helvetica-Bold'),
            ('GRID',         (0, 0), (-1, -1), 0.35, C_BORDER),
            ('VALIGN',       (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING',   (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING',(0, 0), (-1, -1), 5),
            ('LEFTPADDING',  (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('ALIGN',        (1, 1), (-1, -1), 'CENTER'),
            ('BACKGROUND',   (0, 1), (-1, 1),  colors.HexColor('#fefce8')),
            ('TEXTCOLOR',    (0, 1), (-1, 1),  C_AMBER),
            ('BACKGROUND',   (0, 2), (-1, 2),  colors.HexColor('#f0fdf4')),
            ('TEXTCOLOR',    (0, 2), (-1, 2),  C_EMERALD),
            ('BACKGROUND',   (0, 3), (-1, 3),  colors.HexColor('#fff1f2')),
            ('TEXTCOLOR',    (0, 3), (-1, 3),  C_ROSE),
        ]
        nt = Table(nt_rows, colWidths=[W*0.34, W*0.33, W*0.33])
        nt.setStyle(TableStyle(nt_ts))
        story.append(nt)

        if notif_total > 0:
            story.append(Spacer(1, 10))
            d = Drawing(W, 180)
            bc = VerticalBarChart()
            bc.x, bc.y    = 40, 20
            bc.height     = 140
            bc.width      = int(W) - 60
            bc.data       = [[n['draft'], n['sent'], n['failed']]]
            bc.categoryAxis.categoryNames = ['Draft', 'Sent', 'Failed']
            for i, col in enumerate([C_AMBER, C_EMERALD, C_ROSE]):
                bc.bars[0, i].fillColor   = col
                bc.bars[0, i].strokeColor = colors.white
                bc.bars[0, i].strokeWidth = 0.5
            bc.valueAxis.valueMin       = 0
            bc.valueAxis.labelTextFormat = '%d'
            bc.groupSpacing             = 30
            d.add(bc)
            story.append(d)

        # ── Recommendations by segment ────────────────────────────────────────
        if rbs:
            story.append(Paragraph("Recommendations by Segment", s_h2))
            rbs_rows = [['Segment', 'Recommendations']]
            for item in rbs:
                rbs_rows.append([f"Segment {item['segment_label']}", str(item['count'])])
            story.append(styled_table(rbs_rows, [W*0.5, W*0.5]))

            if any(item['count'] > 0 for item in rbs):
                story.append(Spacer(1, 10))
                d = Drawing(W, 180)
                bc = VerticalBarChart()
                bc.x, bc.y = 40, 20
                bc.height  = 140
                bc.width   = int(W) - 60
                bc.data    = [[item['count'] for item in rbs]]
                bc.categoryAxis.categoryNames = [f"Seg {item['segment_label']}" for item in rbs]
                for i in range(len(rbs)):
                    bc.bars[0, i].fillColor   = SEG_COLORS[i % len(SEG_COLORS)]
                    bc.bars[0, i].strokeColor = colors.white
                    bc.bars[0, i].strokeWidth = 0.5
                bc.valueAxis.valueMin        = 0
                bc.valueAxis.labelTextFormat = '%d'
                bc.groupSpacing              = 20
                d.add(bc)
                story.append(d)

        # ── Top recommended products ──────────────────────────────────────────
        if top:
            story.append(Paragraph("Top Recommended Products", s_h2))
            prod_rows = [['Rank', 'Product', 'Count']]
            for i, p in enumerate(top, 1):
                prod_rows.append([str(i), str(p['product']), str(p['count'])])
            story.append(styled_table(prod_rows, [W*0.12, W*0.72, W*0.16]))

        # Footer
        story.append(Spacer(1, 20))
        story.append(HRFlowable(width='100%', thickness=0.5, color=C_BORDER, spaceAfter=6))
        story.append(Paragraph(
            f"RespoFin Analytics Report  ·  {datetime.datetime.now().strftime('%Y')}",
            s_footer,
        ))

        doc.build(story)
        response = HttpResponse(content_type="application/pdf")
        response["Content-Disposition"] = 'attachment; filename="analytics_report.pdf"'
        response.write(buf.getvalue())
        return response