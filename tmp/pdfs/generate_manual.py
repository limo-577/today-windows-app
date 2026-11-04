from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import simpleSplit
import os

ROOT = r"D:\today-windows-app"
OUT = os.path.join(ROOT, "output", "pdf", "今日Windows软件使用说明图册-v1.6.0.pdf")
os.makedirs(os.path.dirname(OUT), exist_ok=True)
os.makedirs(os.path.join(ROOT, "tmp", "pdfs"), exist_ok=True)

W, H = A4
FONT = r"C:\Windows\Fonts\Deng.ttf"
FONT_B = r"C:\Windows\Fonts\Dengb.ttf"
pdfmetrics.registerFont(TTFont("Guide", FONT))
pdfmetrics.registerFont(TTFont("GuideBold", FONT_B))

BG = HexColor("#F5F6F1")
PAPER = HexColor("#FFFFFF")
INK = HexColor("#28332C")
SUB = HexColor("#69756C")
LINE = HexColor("#E2E7DF")
GREEN = HexColor("#66866A")
GREEN_DARK = HexColor("#47684B")
GREEN_PALE = HexColor("#E8F0E7")
GOLD = HexColor("#B98044")
GOLD_PALE = HexColor("#F6EEDF")
RED = HexColor("#AE5548")
RED_PALE = HexColor("#F6E8E4")
BLUE = HexColor("#547A8D")
BLUE_PALE = HexColor("#E8F0F4")
SHADOW = HexColor("#E8EBE5")

c = canvas.Canvas(OUT, pagesize=A4, pageCompression=1)
c.setTitle("今日 Windows 软件使用说明图册 v1.6.0")
c.setAuthor("今日 Windows App")
c.setSubject("面向新手的中文图解使用指南")


def yb(top):
    return H - top


def rect(x, top, w, h, fill=PAPER, stroke=None, radius=10, sw=0.8):
    c.setLineWidth(sw)
    c.setFillColor(fill)
    if stroke:
        c.setStrokeColor(stroke)
        c.roundRect(x, H - top - h, w, h, radius, fill=1, stroke=1)
    else:
        c.roundRect(x, H - top - h, w, h, radius, fill=1, stroke=0)


def line(x1, t1, x2, t2, color=LINE, sw=0.8):
    c.setStrokeColor(color)
    c.setLineWidth(sw)
    c.line(x1, yb(t1), x2, yb(t2))


def txt(x, top, text, size=10, color=INK, bold=False, align="left"):
    font = "GuideBold" if bold else "Guide"
    c.setFont(font, size)
    c.setFillColor(color)
    width = pdfmetrics.stringWidth(str(text), font, size)
    if align == "right":
        x -= width
    elif align == "center":
        x -= width / 2
    c.drawString(x, H - top - size, str(text))
    return width


def wrapped_lines(text, width, size=10, bold=False):
    font = "GuideBold" if bold else "Guide"
    lines = []
    for para in str(text).split("\n"):
        if para == "":
            lines.append("")
            continue
        cur = ""
        for ch in para:
            proposal = cur + ch
            if cur and pdfmetrics.stringWidth(proposal, font, size) > width:
                lines.append(cur)
                cur = ch
            else:
                cur = proposal
        if cur:
            lines.append(cur)
    return lines


def para(x, top, width, text, size=10, leading=15, color=SUB, bold=False, max_lines=None):
    lines = wrapped_lines(text, width, size, bold)
    if max_lines:
        lines = lines[:max_lines]
    for i, ln in enumerate(lines):
        txt(x, top + i * leading, ln, size, color, bold)
    return top + len(lines) * leading


def bullet(x, top, width, text, size=9.5, leading=14, color=SUB, dot=GREEN, bold=False):
    c.setFillColor(dot)
    c.circle(x + 3, H - top - size * 0.64, 2.2, fill=1, stroke=0)
    return para(x + 12, top, width - 12, text, size, leading, color, bold) + 3


def pill(x, top, label, fill=GREEN_PALE, color=GREEN_DARK, size=8, padx=8, height=19, border=None):
    w = pdfmetrics.stringWidth(label, "Guide", size) + padx * 2
    rect(x, top, w, height, fill, border, radius=height / 2, sw=0.6)
    txt(x + w / 2, top + (height - size) / 2 - 1, label, size, color, False, "center")
    return w


def card(x, top, w, h, fill=PAPER, border=LINE):
    rect(x + 1, top + 2, w, h, SHADOW, None, 12)
    rect(x, top, w, h, fill, border, 12)


def card_title(x, top, title, note=None, color=INK):
    txt(x, top, title, 12, color, True)
    if note:
        txt(x, top + 19, note, 8.5, SUB)


def page_header(n, title, intro, group="使用说明"):
    c.setFillColor(BG)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    txt(42, 22, "今日  /  TODAY", 8.5, GREEN_DARK, True)
    txt(W - 42, 22, f"{group}   ·   v1.6.0", 8, SUB, False, "right")
    txt(42, 53, title, 22, INK, True)
    para(42, 84, W - 84, intro, 9.4, 13, SUB)
    line(42, 123, W - 42, 123, LINE, 0.9)
    line(42, 807, W - 42, 807, LINE, 0.7)
    txt(42, 815, "Windows 桌面版  ·  图示为界面示意", 7.5, SUB)
    txt(W - 42, 814, f"{n:02d} / 15", 8, GREEN_DARK, True, "right")


def tag(x, top, n, color=GREEN):
    c.setFillColor(color)
    c.circle(x + 9, H - top - 9, 9, fill=1, stroke=0)
    txt(x + 9, top + 3, str(n), 8, PAPER, True, "center")


def section_label(x, top, text, right=None):
    txt(x, top, text, 12, INK, True)
    if right:
        txt(W - 42, top + 2, right, 8.2, SUB, False, "right")


def small_button(x, top, w, label, active=False, danger=False, size=7.5, h=20):
    fill = RED_PALE if danger else (GREEN if active else HexColor("#F1F3EF"))
    col = PAPER if active and not danger else (RED if danger else SUB)
    rect(x, top, w, h, fill, None, 6)
    txt(x + w / 2, top + (h - size) / 2 - 1, label, size, col, active and not danger, "center")


def draw_main_mockup(x, top, w, h, calendar=False, compact=False):
    """Vector recreation of the application's visible controls, for explanation only."""
    s = w / (820 if calendar else 380)
    rect(x + 2, top + 3, w, h, SHADOW, None, 14)
    rect(x, top, w, h, PAPER, HexColor("#DDE3DA"), 14)
    head_h = max(25, 35 * s)
    txt(x + 12 * s, top + 8 * s + 1, "今日", max(8, 13 * s), SUB, True)
    tools = ["批", "历", "录", "浮", "铃", "色"]
    gap = 3 * s
    bw = max(17 * s, (w - 26 * s - 58 * s - gap * 5) / 6)
    start = x + w - 12 * s - 6 * bw - 5 * gap
    for i, lab in enumerate(tools):
        bx = start + i * (bw + gap)
        rect(bx, top + 6 * s, bw, 22 * s, GREEN_PALE if i == 3 else HexColor("#F5F6F2"), None, 5 * s)
        txt(bx + bw / 2, top + 10 * s, lab, max(6.2, 9 * s), GREEN_DARK if i == 3 else SUB, True, "center")
    line(x + 1, top + head_h, x + w - 1, top + head_h)
    y = top + head_h + 8 * s
    if calendar:
        # Calendar header and left 7-column month grid.
        left_w = w * .64
        side_x = x + left_w + 8 * s
        side_w = w - left_w - 17 * s
        txt(x + left_w * .50, y, "‹       2026年11月       ›", max(8, 13 * s), INK, True, "center")
        y += 23 * s
        txt(x + 4 * s, y, "可拖动任务改期 · 点击日期看当天", max(6, 9 * s), SUB)
        y += 17 * s
        cols = ["一", "二", "三", "四", "五", "六", "日"]
        cell = (left_w - 8 * s) / 7
        for i, lab in enumerate(cols):
            txt(x + 4 * s + i * cell + cell / 2, y, lab, max(5.8, 8 * s), SUB, False, "center")
        y += 16 * s
        for r in range(5):
            for col in range(7):
                d = r * 7 + col - 5
                if d < 1 or d > 30:
                    continue
                bx = x + 3 * s + col * cell
                by = y + r * 43 * s
                if d == 2:
                    rect(bx, by, cell - 3 * s, 38 * s, GREEN_PALE, None, 5 * s)
                txt(bx + cell / 2, by + 2 * s, str(d), max(6, 8 * s), GREEN_DARK if d == 2 else INK, d == 2, "center")
                if d in (2, 7, 10, 16):
                    rect(bx + 2 * s, by + 14 * s, cell - 7 * s, 9 * s, GREEN, None, 2 * s)
                    txt(bx + 4 * s, by + 14 * s, "任务", max(4.6, 6.2 * s), PAPER)
        line(x + left_w + 1 * s, top + head_h + 4 * s, x + left_w + 1 * s, top + h - 10 * s)
        txt(side_x, y - 75 * s, "11月2日", max(7.5, 12 * s), INK, True)
        txt(side_x, y - 58 * s, "星期一 · 2 项", max(5.8, 8 * s), SUB)
        small_button(side_x, y - 33 * s, side_w, "打开当天", True, size=max(5, 7 * s), h=max(14, 20 * s))
        for j, label in enumerate(["09:00 晨会", "阅读30分钟"]):
            rect(side_x, y - 60 * s + j * 28 * s, side_w, 22 * s, HexColor("#F4F5F1"), None, 5 * s)
            txt(side_x + 4 * s, y - 54 * s + j * 28 * s, label, max(5, 7 * s), INK)
        return
    # Daily view.
    c.setFillColor(GREEN_PALE)
    c.circle(x + w / 2, H - y - 10 * s, 10 * s, fill=1, stroke=0)
    txt(x + w / 2, y + 2 * s, "‹       今天       ›", max(8, 14 * s), INK, True, "center")
    y += 30 * s
    txt(x + w / 2, y, "11月2日  ·  星期一", max(6.8, 10 * s), SUB, False, "center")
    y += 20 * s
    small_button(x + 10 * s, y, 70 * s, "+ 添加任务", True, size=max(6, 8.5 * s), h=max(16, 23 * s))
    small_button(x + 84 * s, y, 75 * s, "未完成置顶", size=max(5.2, 7 * s), h=max(16, 23 * s))
    small_button(x + 162 * s, y, 71 * s, "已完成置底", size=max(5.2, 7 * s), h=max(16, 23 * s))
    if w > 300:
        small_button(x + 236 * s, y, 68 * s, "仅未完成", size=7.2, h=23 * s)
    y += 31 * s
    rows = [("09:00", "查看今天的日程安排", False), ("18:00", "回复两封重要邮件", False), ("", "喝一杯水，伸展一下", True)]
    for i, (time, label, done) in enumerate(rows):
        rh = 42 * s
        if i == 0:
            rect(x + 6 * s, y, w - 12 * s, rh, HexColor("#F6F8F4"), None, 7 * s)
        # completion ring
        c.setStrokeColor(GREEN if done else SUB)
        c.setLineWidth(max(.8, 1.5 * s))
        c.setFillColor(GREEN if done else PAPER)
        c.circle(x + 19 * s, H - y - rh / 2, 6.5 * s, fill=1, stroke=1)
        if done:
            line(x + 16.5 * s, y + rh / 2, x + 18.5 * s, y + rh / 2 + 2.5 * s, PAPER, 1.0 * s)
            line(x + 18.5 * s, y + rh / 2 + 2.5 * s, x + 22 * s, y + rh / 2 - 2.5 * s, PAPER, 1.0 * s)
        if time:
            pill(x + 31 * s, y + 9 * s, time, GREEN_PALE, GREEN_DARK, max(5.5, 8 * s), 5 * s, max(13, 18 * s))
            tx = x + 71 * s
        else:
            tx = x + 31 * s
        txt(tx, y + 12 * s, label, max(6.2, 9 * s), SUB if done else INK)
        right = x + w - 12 * s
        controls = ["铃", "改", "计", "×"]
        for j, ctl in enumerate(controls):
            txt(right - (3 - j) * 16 * s, y + 13 * s, ctl, max(5.5, 8 * s), GREEN_DARK if ctl == "计" and i == 0 else SUB, ctl == "计" and i == 0, "center")
        line(x + 9 * s, y + rh, x + w - 9 * s, y + rh, LINE, .45)
        y += rh
    # Timer panel, pinned to bottom.
    panel_top = top + h - max(77, 118 * s)
    line(x + 12 * s, panel_top, x + w - 12 * s, panel_top)
    txt(x + w / 2, panel_top + 8 * s, "25 分钟       60 分钟       自定义", max(6, 8.5 * s), SUB, False, "center")
    txt(x + w / 2 - 12 * s, panel_top + 34 * s, "25:00", max(14, 28 * s), INK, True, "center")
    rect(x + w / 2 + 36 * s, panel_top + 30 * s, 26 * s, 26 * s, GREEN, None, 13 * s)
    txt(x + w / 2 + 49 * s, panel_top + 36 * s, "始", max(7, 11 * s), PAPER, True, "center")
    txt(x + w / 2, panel_top + 64 * s, "测试晚间提醒（模拟22:00）", max(5.4, 7.5 * s), SUB, False, "center")


def draw_calendar_mockup(x, top, w, h):
    draw_main_mockup(x, top, w, h, calendar=True)


def draw_batch_mockup(x, top, w, h):
    rect(x + 2, top + 3, w, h, SHADOW, None, 14)
    rect(x, top, w, h, PAPER, HexColor("#DDE3DA"), 14)
    pad = 14
    txt(x + pad, top + 13, "批量添加计划", 12, INK, True)
    txt(x + w - pad, top + 13, "×", 12, SUB, False, "right")
    rect(x + pad, top + 39, w - pad * 2, 61, HexColor("#F5F6F2"), None, 7)
    txt(x + pad + 8, top + 48, "09:00 晨会", 8.5, INK)
    txt(x + pad + 8, top + 64, "阅读30分钟", 8.5, INK)
    txt(x + pad + 8, top + 80, "每行写一项，可加时间", 7, SUB)
    txt(x + pad, top + 111, "重复方式", 8.5, SUB)
    small_button(x + w - 111, top + 106, 97, "每周指定星期", True, size=7.2, h=21)
    for i, day in enumerate(["一", "二", "三", "四", "五", "六", "日"]):
        small_button(x + pad + i * 29, top + 136, 25, day, active=(i in (0, 2, 4)), size=7, h=24)
    txt(x + pad, top + 171, "应用到哪些天", 8.5, SUB)
    labels = ["今天", "明天", "未来7天", "未来30天"]
    xx = x + pad
    for i, lab in enumerate(labels):
        ww = pill(xx, top + 191, lab, GREEN if i == 2 else HexColor("#F1F3EF"), PAPER if i == 2 else SUB, 7, 6, 19)
        xx += ww + 4
    pill(x + pad, top + 217, "自定义范围", GREEN_PALE, GREEN_DARK, 7, 7, 19)
    # mini calendar
    cal_top = top + 247
    rect(x + pad, cal_top, w - pad * 2, 127, HexColor("#FAFBF9"), LINE, 8)
    txt(x + w / 2, cal_top + 7, "‹     2026年11月     ›", 9, INK, True, "center")
    days = ["一", "二", "三", "四", "五", "六", "日"]
    cell_w = (w - pad * 2 - 14) / 7
    for i, d in enumerate(days):
        txt(x + pad + 7 + i * cell_w + cell_w / 2, cal_top + 27, d, 6.5, SUB, False, "center")
    for r in range(3):
        for col in range(7):
            num = r * 7 + col + 1
            if num > 21:
                break
            bx = x + pad + 7 + col * cell_w
            by = cal_top + 42 + r * 23
            if num in (2, 5, 9, 16):
                rect(bx, by, cell_w - 2, 19, GREEN, None, 4)
            txt(bx + cell_w / 2 - 1, by + 4, str(num), 6.7, PAPER if num in (2, 5, 9, 16) else INK, num in (2, 5, 9, 16), "center")
    small_button(x + pad, top + h - 49, w - pad * 2, "添加到 4 天", True, size=9, h=29)
    txt(x + pad, top + h - 14, "已保存重复计划  ·  展开管理", 7.5, SUB)


def draw_plan_mockup(x, top, w, h):
    rect(x + 2, top + 3, w, h, SHADOW, None, 14)
    rect(x, top, w, h, PAPER, HexColor("#DDE3DA"), 14)
    txt(x + 14, top + 13, "已保存重复计划（2）", 11, INK, True)
    line(x + 12, top + 37, x + w - 12, top + 37)
    plans = [("09:00 晨会", "每周一/三/五 · 2026-11-02 至 2026-12-01", True), ("阅读30分钟", "每天 · 已暂停", False)]
    yy = top + 48
    for title, desc, enabled in plans:
        rect(x + 10, yy, w - 20, 76, HexColor("#FBFCFA"), LINE, 8)
        txt(x + 20, yy + 9, title, 9.5, INK, True)
        para(x + 20, yy + 27, w - 42, desc, 7.2, 10, SUB)
        small_button(x + 20, yy + 50, 43, "编辑", size=6.8, h=19)
        small_button(x + 69, yy + 50, 43, "暂停" if enabled else "恢复", active=not enabled, size=6.8, h=19)
        small_button(x + w - 74, yy + 50, 47, "删除", danger=True, size=6.8, h=19)
        yy += 88
    rect(x + 10, yy + 4, w - 20, h - (yy - top) - 15, GOLD_PALE, None, 8)
    para(x + 19, yy + 12, w - 38, "暂停只停用模板；删除模板不会删掉已生成的任务、已完成任务或任务记录。", 7.3, 10, GOLD)


def draw_timer_mockup(x, top, w, h):
    rect(x + 2, top + 3, w, h, SHADOW, None, 14)
    rect(x, top, w, h, PAPER, HexColor("#DDE3DA"), 14)
    txt(x + 15, top + 15, "专注计时", 11, INK, True)
    txt(x + w - 15, top + 15, "当前任务：准备周会材料", 8, GREEN_DARK, False, "right")
    line(x + 14, top + 40, x + w - 14, top + 40)
    for i, label in enumerate(["25分钟", "60分钟", "自定义"]):
        small_button(x + 26 + i * ((w - 52) / 3), top + 58, (w - 72) / 3, label, active=(i == 0), size=8, h=24)
    # Progress arc as visual cue.
    cx, cy, r = x + w / 2, H - top - 163, 61
    c.setStrokeColor(HexColor("#E9EEE8"))
    c.setLineWidth(8)
    c.circle(cx, cy, r, fill=0, stroke=1)
    c.setStrokeColor(GREEN)
    c.setLineWidth(8)
    c.arc(cx - r, cy - r, cx + r, cy + r, 60, 280)
    txt(cx, top + 128, "24:36", 29, INK, True, "center")
    txt(cx, top + 164, "正在记录本次专注", 8.5, SUB, False, "center")
    small_button(x + w / 2 - 76, top + h - 54, 50, "重置", size=8, h=27)
    small_button(x + w / 2 - 15, top + h - 54, 90, "Ⅱ  暂停", True, size=8.5, h=27)


def draw_countdown_mockup(x, top, w, h):
    rect(x + 2, top + 3, w, h, SHADOW, None, 14)
    rect(x, top, w, h, PAPER, HexColor("#DDE3DA"), 14)
    txt(x + 14, top + 13, "目标倒计时", 11, INK, True)
    rect(x + 12, top + 39, w - 24, 55, GREEN_PALE, None, 9)
    txt(x + 23, top + 47, "下班", 8.5, GREEN_DARK, True)
    txt(x + w - 22, top + 47, "18:00 · 每天", 7, SUB, False, "right")
    txt(x + 23, top + 64, "还有 02:14:38", 16, INK, True)
    txt(x + 14, top + 111, "新增一个提醒目标", 9.5, INK, True)
    fields = [("名称", "买菜"), ("目标时间", "18:30"), ("重复", "每周 / 指定星期"), ("提前提醒", "30 分钟"), ("到点提醒", "开启")]
    yy = top + 133
    for k, val in fields:
        rect(x + 12, yy, w - 24, 34, HexColor("#F5F6F2"), None, 6)
        txt(x + 21, yy + 10, k, 7.2, SUB)
        txt(x + w - 21, yy + 10, val, 7.5, INK, False, "right")
        yy += 41
    small_button(x + 12, top + h - 43, w - 24, "添加倒计时", True, size=8.5, h=27)


def draw_records_mockup(x, top, w, h):
    rect(x + 2, top + 3, w, h, SHADOW, None, 14)
    rect(x, top, w, h, PAPER, HexColor("#DDE3DA"), 14)
    txt(x + 14, top + 13, "任务记录", 11, INK, True)
    small_button(x + 14, top + 38, w - 28, "日期范围：11/01 至 11/07", size=7.5, h=23)
    txt(x + 14, top + 73, "共 8 条 · 4小时20分", 8, SUB)
    small_button(x + w - 91, top + 67, 77, "导出 CSV", True, size=7.5, h=23)
    line(x + 12, top + 99, x + w - 12, top + 99)
    rows = [("11月2日", "准备周会材料", "09:12–09:37 · 25分"), ("11月2日", "阅读30分钟", "10:03–10:33 · 30分"), ("11月1日", "整理邮箱", "15:00–15:18 · 18分")]
    yy = top + 110
    for date, task, duration in rows:
        txt(x + 15, yy, date, 7.1, GREEN_DARK, True)
        txt(x + 15, yy + 13, task, 8.2, INK)
        txt(x + w - 15, yy + 13, duration, 6.8, SUB, False, "right")
        line(x + 14, yy + 32, x + w - 14, yy + 32)
        yy += 45
    small_button(x + 14, top + h - 45, w - 28, "清理记录：按日 / 按月 / 全部", danger=True, size=7.3, h=25)


def draw_float_mockup(x, top, w, h):
    rect(x + 2, top + 3, w, h, SHADOW, None, 14)
    rect(x, top, w, h, PAPER, HexColor("#DDE3DA"), 14)
    rect(x, top, w, 31, HexColor("#F7F8F5"), None, 12)
    txt(x + 14, top + 8, "针", 9, GREEN_DARK, True)
    txt(x + w * .45, top + 9, "拖动窗口", 7.2, SUB, False, "center")
    txt(x + w - 55, top + 9, "透明度", 6.2, GREEN)
    txt(x + w - 15, top + 8, "×", 11, SUB, False, "right")
    txt(x + w / 2, top + 44, "09:41:26", 20, INK, True, "center")
    line(x + 10, top + 77, x + w - 10, top + 77)
    tasks = [("09:00", "查看今天的安排"), ("18:00", "回复重要邮件"), ("", "喝水并伸展")]
    yy = top + 91
    for i, (time, title) in enumerate(tasks):
        c.setStrokeColor(GREEN if i == 0 else SUB)
        c.setLineWidth(1.2)
        c.circle(x + 17, H - yy - 7, 6, fill=0, stroke=1)
        if time:
            txt(x + 30, yy + 1, time, 7, SUB)
            txt(x + 66, yy + 1, title, 7.7, INK)
        else:
            txt(x + 30, yy + 1, title, 7.7, INK)
        rect(x + w - 32, yy - 1, 18, 18, GREEN_PALE, None, 9)
        txt(x + w - 23, yy + 3, "计", 6, GREEN_DARK, True, "center")
        yy += 38
    txt(x + 16, top + h - 20, "仅显示未完成任务  ·  操作与主界面同步", 7, SUB)


# PAGE 1 · Cover
c.setFillColor(BG)
c.rect(0, 0, W, H, fill=1, stroke=0)
rect(365, 56, 212, 720, GREEN_PALE, None, 32)
txt(46, 46, "TODAY  /  WINDOWS APP", 9, GREEN_DARK, True)
pill(46, 120, "新手入门 · 图解版", PAPER, GREEN_DARK, 9, 10, 24)
txt(44, 178, "今日", 48, INK, True)
txt(47, 237, "软件使用说明图册", 23, INK, True)
para(48, 282, 290, "把每天要做的事写下来，按时提醒，专心完成，再回头看看自己的投入。", 12, 20, SUB)
line(48, 365, 323, 365, HexColor("#CBD8CB"), 1)
txt(48, 389, "适用版本", 8.5, SUB)
txt(48, 405, "Today Windows App  ·  v1.6.0", 11, INK, True)
txt(48, 440, "适用系统", 8.5, SUB)
txt(48, 456, "Windows 10 / Windows 11  ·  x64", 10, INK, True)
txt(48, 509, "从第一次打开，到每项功能都会用", 12, GREEN_DARK, True)
for i, (label, note) in enumerate([
    ("安排", "单条任务、批量计划与重复任务"),
    ("专注", "倒计时、任务计时和完成记录"),
    ("提醒", "任务闹钟、目标提醒与桌面悬浮窗"),
]):
    yy = 548 + i * 50
    tag(49, yy, i + 1, GREEN if i < 2 else GOLD)
    txt(73, yy + 1, label, 10, INK, True)
    txt(112, yy + 2, note, 8.7, SUB)
draw_main_mockup(379, 132, 184, 525, compact=True)
txt(470, 679, "主界面示意", 8, GREEN_DARK, True, "center")
rect(395, 715, 151, 42, PAPER, None, 12)
txt(470, 726, "读图提示", 8, INK, True, "center")
txt(470, 740, "图中按钮位置按 v1.6.0 重画", 7.1, SUB, False, "center")
line(46, 790, W - 46, 790, LINE, .8)
txt(47, 800, "中文图解  ·  每项功能都有说明", 8, SUB)
txt(W - 47, 800, "15 页", 8, GREEN_DARK, True, "right")
c.showPage()


# PAGE 2 · Install and first launch
page_header(2, "先开始：安装与第一次打开", "这是一款 Windows 桌面待办与专注工具。跟着三步就能开始，不需要注册账号。", "开始使用")
section_label(42, 145, "第一次使用只要 3 步")
steps = [
    ("01", "运行软件", "安装版按提示完成安装；便携版直接双击 Today-Portable-1.6.0-x64.exe。"),
    ("02", "打开“今日”", "第一次打开后会看到当天任务、计时器和顶部功能按钮。"),
    ("03", "写下第一件事", "点击“添加任务”，输入任务名称；需要的话再加时间、备注或提醒。"),
]
for i, (n, title, body) in enumerate(steps):
    x = 42 + i * 174
    card(x, 176, 160, 133)
    tag(x + 13, 190, n)
    txt(x + 40, 192, title, 11, INK, True)
    para(x + 14, 225, 132, body, 8.6, 13, SUB)
section_label(42, 339, "下载文件怎么选？")
card(42, 366, 245, 96, PAPER)
card_title(58, 380, "安装版", "适合固定在这台电脑上使用")
para(58, 418, 215, "运行 Today-Setup-1.6.0-x64.exe，按屏幕上的提示安装。", 9.2, 14, SUB)
card(304, 366, 249, 96, PAPER)
card_title(320, 380, "便携版", "不走传统安装流程")
para(320, 418, 216, "运行 Today-Portable-1.6.0-x64.exe。适合临时使用或不想安装时选择。", 9.2, 14, SUB)
section_label(42, 489, "打开后，先记住这 4 件事")
items = [
    ("不用登录", "打开就能用，不需要创建账号。"),
    ("任务存在本机", "任务、设置和计时记录会自动保存在这台电脑。"),
    ("关闭窗口不等于退出", "点主窗口右上角 × 后，软件会缩到系统托盘继续提醒。"),
    ("提醒受 Windows 控制", "若系统通知被关掉，请到 Windows“设置 → 系统 → 通知”中允许“今日”通知。"),
]
for i, (title, body) in enumerate(items):
    col = i % 2
    row = i // 2
    x = 42 + col * 262
    top = 519 + row * 94
    card(x, top, 248, 78)
    txt(x + 13, top + 11, title, 9.5, GREEN_DARK, True)
    para(x + 13, top + 32, 220, body, 8.4, 12, SUB)
c.showPage()


# PAGE 3 · Home overview
page_header(3, "先认识主界面", "主界面分为顶部工具、日期与任务列表、底部专注计时。图中的示例日期和任务只是演示。")
draw_main_mockup(42, 150, 246, 430)
txt(165, 589, "A. 当天任务视图（示意）", 8, GREEN_DARK, True, "center")
section_label(316, 149, "顶部 6 个按钮")
top_tools = [
    ("批", "批量添加计划", "一次写多条任务，也可以选日期和重复方式。"),
    ("历", "日历 / 列表", "在当天任务和整月日历之间切换。"),
    ("录", "任务记录", "查看专注时长、按日期筛选并导出 CSV。"),
    ("浮", "独立悬浮窗", "把未完成任务放在桌面一角。"),
    ("铃", "提醒铃声", "选择 Windows 默认提示音或自己的音频。"),
    ("色", "浅色 / 深色", "点击切换界面主题。"),
]
yy = 178
for mark, title, body in top_tools:
    rect(316, yy, 31, 27, GREEN_PALE, None, 7)
    txt(331.5, yy + 7, mark, 9, GREEN_DARK, True, "center")
    txt(357, yy + 2, title, 9.2, INK, True)
    end = para(357, yy + 16, 194, body, 7.6, 10.5, SUB)
    yy = max(yy + 45, end + 6)
card(316, 462, 237, 111, BLUE_PALE)
txt(330, 477, "目标倒计时卡片", 10, BLUE, True)
para(330, 499, 208, "在任务列表上方显示最近一个目标还剩多久。点击卡片可打开目标管理；还没有目标时，这里会显示“添加目标倒计时”。", 8.4, 12, SUB)
card(316, 592, 237, 160, PAPER)
txt(330, 607, "当天任务区", 10, INK, True)
for i, text in enumerate([
    "左、右箭头：前一天 / 后一天。",
    "未完成置顶、已完成置底：调整列表显示顺序。",
    "仅未完成：暂时隐藏已完成任务。",
    "浅色小圆点：表示数据会自动保存。",
]):
    bullet(331, 632 + i * 28, 207, text, 8, 11.5)
card(42, 630, 246, 122, GREEN_PALE)
txt(56, 644, "底部计时区", 10, GREEN_DARK, True)
para(56, 666, 218, "可选 25 分钟、60 分钟或自定义时长。若要把时间记到某个任务上，请先点该任务右侧的“计时”按钮。", 8.5, 12.5, SUB)
txt(56, 724, "小提示：日历视图会把窗口自动放大，方便看整月。", 7.6, GREEN_DARK)
c.showPage()


# PAGE 4 · Single tasks
page_header(4, "单条任务：添加、编辑、完成", "适合临时想到一件事时快速记下来。任务行右侧的小按钮各有不同用途。")
section_label(42, 146, "添加一项任务")
card(42, 174, 511, 115)
pill(58, 190, "+ 添加任务", GREEN, PAPER, 9, 10, 24)
para(177, 191, 352, "点击后输入任务名称，再点“添加”。按 Enter 也能提交。按时间排序时，带时间的任务会按先后排列；没写时间的任务排在后面。", 9.2, 14, SUB)
rect(58, 234, 468, 34, HexColor("#F4F6F2"), None, 8)
txt(72, 244, "输入示例：  18:00 交报告", 9.5, INK, True)
txt(519, 244, "自动拆成 18:00 + 任务名称", 7.5, GREEN_DARK, False, "right")
section_label(42, 311, "一行任务里有什么？", "按钮含义从左到右")
card(42, 338, 511, 83)
drawn = [
    ("○", "完成 / 撤销", "点圆圈完成；再点可改回未完成。"),
    ("09:00", "计划时间", "显示任务预计开始时间。"),
    ("备", "备注", "编辑时填写，点“备注”展开查看。"),
    ("铃", "提醒", "设置或取消这项任务的闹钟。"),
    ("改", "编辑", "改名称、时间和备注。"),
    ("计", "专注", "开始 / 暂停这项任务的计时。"),
    ("×", "删除", "删除任务，也会删除这项任务的记录。"),
]
xx = 57
for mark, title, body in drawn:
    txt(xx, 354, mark, 10, GREEN_DARK, True)
    txt(xx + 18, 355, title, 8.5, INK, True)
    para(xx, 375, 62, body, 7, 9.5, SUB)
    xx += 70
section_label(42, 445, "常用显示方式")
cards = [
    (42, "未完成置顶", "把还没做的任务放在上面，避免漏看。"),
    (216, "已完成置底", "将勾选完成的任务移到列表下方。"),
    (390, "仅未完成", "只看还没完成的项目；关闭后恢复全部。"),
]
for x, title, body in cards:
    card(x, 472, 163, 88)
    txt(x + 13, 485, title, 9.3, INK, True)
    para(x + 13, 507, 137, body, 8.2, 12, SUB)
card(42, 584, 511, 172, GOLD_PALE, HexColor("#EBDDCA"))
txt(58, 599, "在任务输入框里设置重复", 10, GOLD, True)
para(58, 622, 477, "选“每天重复”“每周重复”或“工作日重复”，软件会按所选规则先生成一组日期上的任务，并保存一个重复计划。每周重复默认从当前日期的星期开始。", 8.8, 13, SUB)
bullet(58, 671, 477, "快捷添加的生成范围：每天 30 天、每周 12 次、工作日 22 个工作日。", 8.4, 12, SUB, GOLD)
bullet(58, 701, 477, "要安排更长日期范围、指定多个星期或保存一批任务，请用顶部“批量添加计划”。", 8.4, 12, SUB, GOLD)
c.showPage()


# PAGE 5 · Batch add
page_header(5, "批量安排：一次写多条任务", "要一次安排几天的事情，打开顶部“批量添加计划”。每一行会变成一项任务。")
draw_batch_mockup(42, 149, 292, 506)
txt(188, 664, "批量添加弹窗（示意）", 8, GREEN_DARK, True, "center")
section_label(359, 151, "照着做就行")
steps = [
    ("1", "每行写一项", "例如：\n09:00 晨会\n阅读30分钟"),
    ("2", "选择重复方式", "不重复、每天、每周指定星期，或工作日。每周可勾选一周中的一个或多个星期。"),
    ("3", "选择日期", "可点日历里的日期，也可用今天、明天、未来7天、未来30天这些快捷按钮。"),
    ("4", "点“添加到 … 天”", "按钮会显示选择了几天。确认后，输入的任务会加到所选的日期。"),
]
yy = 183
for n, title, body in steps:
    tag(360, yy, n)
    txt(385, yy + 1, title, 9.5, INK, True)
    end = para(385, yy + 20, 158, body, 8.1, 12, SUB)
    yy = end + 15
card(357, 465, 196, 113, BLUE_PALE)
txt(371, 480, "自定义日期范围", 9.5, BLUE, True)
para(371, 503, 166, "填写开始日期和结束日期，再点“应用”。若同时选了重复方式，软件会自动只选符合条件的日期。", 8.1, 12, SUB)
txt(371, 554, "一次最多选 3 年。", 8.1, BLUE, True)
card(357, 592, 196, 160, GOLD_PALE, HexColor("#EBDDCA"))
txt(371, 607, "排日期的小窍门", 9.5, GOLD, True)
para(371, 630, 166, "自定义范围结束日期不能早于开始日期。若选“每周指定星期”，先勾星期，再应用日期范围。", 8.1, 12, SUB)
para(371, 691, 166, "底部“已保存重复计划”可展开，之后还能快速查看和管理这些计划。", 8.1, 12, SUB)
c.showPage()


# PAGE 6 · Repeat plan management
page_header(6, "重复计划：再次使用、修改或暂停", "重复计划像一张可复用的任务模板。它让重复任务更容易重新选用和统一管理。")
draw_plan_mockup(42, 154, 258, 352)
txt(171, 514, "已保存重复计划（示意）", 8, GREEN_DARK, True, "center")
section_label(327, 151, "计划管理按钮")
manage = [
    ("编辑", "改任务名称、计划时间和重复方式。每周计划还可以改星期。修改会更新关联的未完成任务。"),
    ("暂停", "暂时不在快速选择中显示这张模板；已经生成的任务仍保留。"),
    ("恢复", "重新启用暂停的模板，让它能再次被选用。"),
    ("删除", "移除模板并解除现有任务的重复关系；已生成任务和记录不会被删。"),
]
yy = 181
for title, body in manage:
    pill(327, yy, title, GREEN_PALE, GREEN_DARK, 8, 9, 20)
    end = para(389, yy + 1, 160, body, 8.2, 12, SUB)
    yy = max(yy + 46, end + 10)
card(42, 551, 511, 204, PAPER)
txt(58, 566, "两个常用入口", 10, INK, True)
card(58, 594, 222, 126, GREEN_PALE, None)
txt(73, 608, "添加时选择重复", 9.3, GREEN_DARK, True)
para(73, 631, 192, "在单条添加或批量添加中选重复方式，软件按规则生成任务，并把规则保存为计划。", 8.2, 12, SUB)
card(294, 594, 241, 126, BLUE_PALE, None)
txt(309, 608, "以后快速再加", 9.3, BLUE, True)
para(309, 631, 211,  "单条添加区可从已有重复任务中选模板；选择后会把一项任务加到当前查看的日期。", 8.2, 12, SUB)
para(58, 731, 474, "记住：暂停模板不会删除已生成的任务；删除模板也只解除重复关系，不清理任务或记录。", 8.2, 12, RED, True)
c.showPage()


# PAGE 7 · Calendar
page_header(7, "日历：查看、改期和处理旧任务", "切换到日历后能一次看整月。点某一天，右侧就会显示那天的任务。")
draw_calendar_mockup(42, 151, 351, 334)
txt(218, 494, "日历视图（示意）", 8, GREEN_DARK, True, "center")
section_label(414, 149, "日历里可以做什么？")
calendar_features = [
    ("翻月份", "左右箭头切换上个月、下个月。"),
    ("选日期", "点击某一天，右侧查看当天任务；再点“打开当天”回到列表。"),
    ("拖动改期", "在日历中按住某个任务，拖到另一天的格子。"),
    ("移到今天", "过去日期还有未完成任务时，可逐项移到今天，或一次全部移到今天。"),
    ("删除一项", "右侧任务旁的 × 会删除这一项任务及其记录。"),
]
yy = 177
for title, body in calendar_features:
    txt(414, yy, title, 8.8, GREEN_DARK, True)
    end = para(414, yy + 15, 138, body, 7.8, 11, SUB)
    yy = end + 8
card(42, 537, 511, 101, GREEN_PALE, None)
txt(58, 552, "处理积压：日历右侧的未完成任务", 10, GREEN_DARK, True)
para(58, 575, 478, "先选过去的日期，再按“移到今天”；如果想一次处理全部未完成任务，按“全部未完成移到今天”。已完成任务不会跟着移动。", 8.8, 13, SUB)
card(42, 657, 511, 99, PAPER)
txt(58, 672, "切换方式", 9.5, INK, True)
para(58, 695, 478, "点击窗口顶部的日历图标进入日历；再点击同一个位置的列表图标返回当天任务。软件会自动放大日历窗口，看完后会恢复之前的窗口大小。", 8.5, 12.5, SUB)
c.showPage()


# PAGE 8 · Cleanup
page_header(8, "清理计划：删一项、多天或整月", "日历的“多天清理”可以跨日期选择。凡是批量清理，都要在按钮变成确认文字后再点一次。")
section_label(42, 147, "多天清理 3 步")
flow = [
    ("① 选日期", "点“多天清理”，再在左侧日历里选一个或多个日期。"),
    ("② 选任务", "右侧会列出这些日期的任务。勾选只想删掉的项目。"),
    ("③ 确认操作", "选中的任务可单独删除；也可以清空所选日期的全部任务。"),
]
for i, (title, body) in enumerate(flow):
    x = 42 + i * 174
    card(x, 176, 160, 125)
    txt(x + 14, 192, title, 10, GREEN_DARK, True)
    para(x + 14, 219, 132, body, 8.5, 13, SUB)
    if i < 2:
        txt(x + 162, 221, "→", 14, GREEN, True, "center")
section_label(42, 326, "清理按钮在哪里？")
card(42, 353, 511, 190)
rows = [
    ("日历右侧", "清空所选日期", "删除当前点选这一天的全部任务。"),
    ("日历右侧", "清空本月计划", "删除当前日历月份里的任务。"),
    ("日历右侧", "清空全部计划", "删除所有日期的任务。"),
    ("多天清理", "删除选中任务", "仅删除打勾的任务，不清空这几天的其他任务。"),
    ("多天清理", "清空所选日期", "把选中的几天全部清空。"),
]
yy = 369
for area, action, desc in rows:
    pill(58, yy, area, HexColor("#F1F3EF"), SUB, 7.1, 7, 18)
    txt(131, yy + 2, action, 8.2, INK, True)
    txt(239, yy + 2, desc, 7.8, SUB)
    yy += 31
card(42, 568, 511, 95, RED_PALE, HexColor("#EDD7D2"))
txt(58, 583, "删除 / 清空前请留意", 10, RED, True)
para(58, 606, 477, "日历中的清理操作会先变成“再点一次……”或“确定清空？”。确认前可以取消或离开清理模式。任务删除后，对应任务记录也会一起删除。", 8.7, 13, SUB)
card(42, 681, 511, 76, BLUE_PALE, None)
txt(58, 695, "记录的清理位置不同", 9.2, BLUE, True)
para(58, 716, 477, "任务记录弹窗可按某一天、某个月或全部清理记录；删除记录和删除任务不是同一个操作。", 8.1, 12, SUB)
c.showPage()


# PAGE 9 · Focus timer
page_header(9, "专注计时：为任务记录投入时间", "想知道一项任务花了多久，先从任务行右侧的“计时”按钮开始专注。")
draw_timer_mockup(42, 155, 333, 294)
txt(208, 459, "计时区（示意）", 8, GREEN_DARK, True, "center")
section_label(397, 152, "计时按钮")
timer_actions = [
    ("25 分钟 / 60 分钟", "点一个时长，快速设定倒计时。"),
    ("自定义", "输入 1–1440 分钟，也就是 1 分钟到 24 小时。"),
    ("开始 / 暂停", "开始或暂停当前计时。"),
    ("重置", "结束当前计时并把时间恢复到设定时长。"),
    ("× 结束任务计时", "结束当前任务的计时，保留已记录的投入时间。"),
]
yy = 181
for title, body in timer_actions:
    txt(397, yy, title, 8.7, GREEN_DARK, True)
    end = para(397, yy + 15, 155, body, 7.8, 11, SUB)
    yy = end + 7
card(42, 501, 511, 130, GREEN_PALE, None)
txt(58, 516, "切换任务不会丢掉剩余时间", 10, GREEN_DARK, True)
para(58, 539, 479, "同一时间只会有一个任务在计时。开始另一项任务时，当前任务会自动暂停并记住剩余时间；之后点回原任务的“计时”按钮，可以接着计时。主窗口和悬浮窗会同步。", 8.8, 13, SUB)
card(42, 649, 511, 107, GOLD_PALE, HexColor("#EBDDCA"))
txt(58, 663, "计时记录怎么产生？", 9.5, GOLD, True)
para(58, 685, 479, "暂停、切换或结束任务时会保存本次专注；同一任务同一天的多段专注会合并显示。只勾选完成、但没有开始计时的任务，也会留下 0 秒完成记录。", 8.4, 12.2, SUB)
c.showPage()


# PAGE 10 · Countdown
page_header(10, "目标倒计时：盯住一个重要时刻", "例如下班、出门、会议或活动开始时间。它按日历时间提醒你，不是专注计时器。")
draw_countdown_mockup(42, 151, 273, 408)
txt(178, 568, "倒计时管理（示意）", 8, GREEN_DARK, True, "center")
section_label(342, 149, "新增一个目标")
count_steps = [
    ("1", "添加倒计时", "点击主界面目标倒计时区域；还没有目标时，点“添加目标倒计时”。"),
    ("2", "填写名称和时间", "例如“买菜”与 18:30。"),
    ("3", "选择重复方式", "每天；每周（可指定星期）；或每月某一天。"),
    ("4", "设提前提醒", "输入提前多少分钟提醒；勾选“到点提醒”可在目标时间再提醒一次。"),
    ("5", "点击添加", "主界面会展示最近的一个目标及剩余时间。"),
]
yy = 177
for n, title, body in count_steps:
    tag(342, yy, n, BLUE)
    txt(367, yy + 1, title, 9, INK, True)
    end = para(367, yy + 18, 185, body, 7.8, 11, SUB)
    yy = end + 7
card(342, 512, 211, 100, BLUE_PALE, None)
txt(356, 526, "目标列表管理", 9.3, BLUE, True)
para(356, 548, 181, "点已有目标可以编辑；“启用 / 关闭”控制提醒；× 删除这个目标。", 8.1, 12, SUB)
card(342, 628, 211, 128, GOLD_PALE, None)
txt(356, 642, "提前提醒设为 0", 9.3, GOLD, True)
para(356, 664, 181, "表示不提前提醒。若启用了“到点提醒”，目标时间到了仍会收到提醒。", 8.1, 12, SUB)
card(42, 596, 273, 160, BLUE_PALE, None)
txt(58, 611, "提醒时间轴", 9.3, BLUE, True)
pill(59, 638, "17:30", PAPER, BLUE, 8, 9, 22)
txt(129, 642, "提前 30 分钟提醒", 8, SUB)
line(87, 674, 242, 674, BLUE, 1.3)
pill(59, 687, "18:00", GREEN, PAPER, 8, 9, 22)
txt(129, 691, "目标时间到点", 8, INK, True)
para(58, 722, 238, "“到点提醒”勾选后才会收到第二次提醒。", 7.6, 10.5, SUB)
c.showPage()


# PAGE 11 · Notifications and sound
page_header(11, "提醒：任务闹钟、晚间提示和铃声", "任务提醒和目标倒计时会弹出 Windows 系统通知；应用内部也会显示提示。")
section_label(42, 147, "三种提醒，各有用途")
reminders = [
    ("单项任务闹钟", "新任务若写了计划时间，默认在这个时间提醒。点铃铛可改提醒时间或关闭提醒。", GREEN_PALE, GREEN_DARK),
    ("目标倒计时", "可选提前多少分钟提醒，并决定目标时间到达时是否再提醒一次。", BLUE_PALE, BLUE),
    ("每晚 22:00", "当天还有未完成任务时，软件弹出 Windows 通知和晚间任务清单。", GOLD_PALE, GOLD),
]
for i, (title, body, fill, color) in enumerate(reminders):
    x = 42 + i * 174
    card(x, 176, 160, 141, fill, None)
    txt(x + 14, 192, title, 9.2, color, True)
    para(x + 14, 218, 132, body, 8, 12, SUB)
section_label(42, 341, "设置喜欢的铃声")
card(42, 368, 511, 131)
flow = [("默认", "使用 Windows 默认提示音"), ("自定义", "选择 MP3、WAV、M4A 或 OGG 音频"), ("试听", "选择自定义声音后可试听")]
for i, (title, body) in enumerate(flow):
    x = 58 + i * 164
    pill(x, 388, title, GREEN if i == 1 else HexColor("#F1F3EF"), PAPER if i == 1 else SUB, 8, 9, 21)
    para(x, 420, 145, body, 8.2, 12, SUB)
para(58, 469, 477, "从主界面顶部的铃铛按钮打开设置。自定义铃声不能超过 20 MB；软件会复制到本机的数据目录，因此原音频文件移动后仍可使用。", 8.2, 12, SUB)
section_label(42, 526, "提醒没有弹出来？")
card(42, 553, 511, 203, PAPER)
checks = [
    "到 Windows：设置 → 系统 → 通知，确认“今日”的通知权限已开启。",
    "任务闹钟只提醒今天的未完成任务；检查任务日期、完成状态和铃铛时间。",
    "每晚 22:00 的晚间清单只在当天还有未完成任务时出现。",
    "点击底部“测试晚间提醒（模拟22:00）”，可预览晚间清单和系统通知。",
    "点击系统通知：任务提醒会打开对应日期；倒计时提醒会打开倒计时管理。",
]
yy = 572
for item in checks:
    yy = bullet(59, yy, 476, item, 8.2, 12, SUB)
c.showPage()


# PAGE 12 · Records
page_header(12, "任务记录：回看投入并导出 CSV", "打开顶部的“任务记录”按钮，按天查看已完成任务的专注时间。")
draw_records_mockup(42, 151, 327, 360)
txt(205, 520, "任务记录弹窗（示意）", 8, GREEN_DARK, True, "center")
section_label(391, 149, "查看和导出")
record_steps = [
    ("筛选", "选“全部日期”或指定日期。也可以输入开始、结束日期，按日期范围筛选。"),
    ("看合计", "弹窗顶部显示符合条件的记录条数和总用时。每天还会单独显示当天合计。"),
    ("导出", "点“导出 CSV”，保存当前筛选出的记录。可用 Excel 打开。"),
]
yy = 178
for title, body in record_steps:
    txt(391, yy, title, 9, GREEN_DARK, True)
    end = para(391, yy + 17, 160, body, 8, 11.5, SUB)
    yy = end + 11
card(391, 370, 162, 140, BLUE_PALE, None)
txt(405, 384, "CSV 里有什么？", 9.2, BLUE, True)
para(405, 407, 133, "日期、任务名称、开始时间、结束时间和花费秒数。导出范围跟当前筛选一致。", 8.1, 12, SUB)
card(42, 556, 511, 90, GREEN_PALE, None)
txt(58, 570, "记录来自哪里？", 9.5, GREEN_DARK, True)
para(58, 593, 477, "任务计时开始后，暂停、切换或结束时会记下投入时间。把任务勾选完成也会留下完成记录；若从未计时，时长显示为 0 秒。", 8.5, 12.5, SUB)
card(42, 662, 511, 94, RED_PALE, HexColor("#EDD7D2"))
txt(58, 676, "清理记录", 9.5, RED, True)
para(58, 699, 477, "可删除单条记录，也可按日期、按月份或清空全部。清理按钮需要再点一次确认。清理记录不会删除任务；删除任务则会一并删除它的记录。", 8.3, 12.2, SUB)
c.showPage()


# PAGE 13 · Floating window
page_header(13, "桌面悬浮窗：把未完成任务放在眼前", "点主界面顶部的悬浮窗按钮，或从系统托盘菜单中打开。它是独立窗口，可以拖到主窗口外。")
draw_float_mockup(42, 154, 257, 355)
txt(170, 518, "独立悬浮窗（示意）", 8, GREEN_DARK, True, "center")
section_label(328, 151, "顶部控件")
float_items = [
    ("图钉", "置顶 / 取消置顶。开启后窗口会浮在其他软件上面。"),
    ("拖动把手", "拖动窗口到桌面任意位置，也可拖到第二块显示器。"),
    ("透明度滑块", "调节窗口透明度，约 30% 到 100%。"),
    ("×", "只关闭悬浮窗，主程序仍继续运行。"),
]
yy = 182
for title, body in float_items:
    txt(328, yy, title, 8.8, GREEN_DARK, True)
    end = para(328, yy + 15, 223, body, 7.9, 11.5, SUB)
    yy = end + 8
card(328, 393, 225, 130, BLUE_PALE, None)
txt(342, 407, "悬浮窗里可以做什么？", 9.3, BLUE, True)
bullet(343, 432, 196, "查看当前时间和今天未完成的任务。", 7.9, 11, SUB, BLUE)
bullet(343, 460, 196, "勾选任务完成；点计时按钮开始、继续或暂停该任务。", 7.9, 11, SUB, BLUE)
bullet(343, 498, 196, "操作会同步回主界面。", 7.9, 11, SUB, BLUE)
card(42, 566, 511, 190, PAPER)
txt(58, 581, "窗口之间的关系", 10, INK, True)
para(58, 605, 476, "主界面和悬浮窗共用同一份任务与计时状态。最小化或隐藏主窗口后，悬浮窗仍可显示；关掉悬浮窗不会退出软件。", 8.7, 13, SUB)
line(70, 656, 520, 656, LINE, 1)
pill(82, 673, "主界面", GREEN_PALE, GREEN_DARK, 8.5, 11, 22)
txt(185, 678, "同步任务、完成状态和计时", 9, SUB, True)
pill(430, 673, "悬浮窗", BLUE_PALE, BLUE, 8.5, 11, 22)
para(58, 710, 477, "主界面彻底退出时悬浮窗也会关闭。图钉、透明度、窗口位置等状态会记住。", 8.2, 12, SUB)
c.showPage()


# PAGE 14 · Theme, local data, tray
page_header(14, "主题、自动保存与系统托盘", "这几项不在任务列表里，但会影响软件日常使用。")
section_label(42, 148, "浅色 / 深色主题")
card(42, 175, 245, 109, PAPER)
pill(58, 191, "浅色", GREEN_PALE, GREEN_DARK, 8, 9, 21)
txt(58, 226, "背景更亮，适合白天。", 8.7, SUB)
rect(58, 249, 85, 22, HexColor("#FCFCFA"), LINE, 5)
rect(149, 249, 85, 22, HexColor("#EDEEEA"), None, 5)
card(304, 175, 249, 109, HexColor("#242521"), HexColor("#3A403A"))
pill(320, 191, "深色", HexColor("#3E5141"), HexColor("#D9E8D9"), 8, 9, 21)
txt(320, 226, "夜间看起来更柔和。", 8.7, HexColor("#D8DDD5"))
rect(320, 249, 85, 22, HexColor("#1B1B19"), None, 5)
rect(411, 249, 85, 22, HexColor("#111110"), None, 5)
para(42, 300, 511, "点主界面顶部的太阳 / 月亮按钮即可切换；软件会记住你的选择。", 8.4, 12, SUB)

section_label(42, 346, "自动保存和本地数据")
card(42, 373, 511, 112, GREEN_PALE, None)
txt(58, 388, "更改会自动保存", 10, GREEN_DARK, True)
para(58, 411, 478, "任务、完成状态、重复计划、记录、目标倒计时、列表显示方式、铃声、主题和任务计时状态会保存在本机用户数据目录里。", 8.8, 13, SUB)
txt(58, 461, "不需要账号；核心功能不依赖在线服务。", 8.5, GREEN_DARK, True)

section_label(42, 514, "点主窗口右上角 × 之后")
card(42, 541, 511, 215, PAPER)
flow = [
    ("① 隐藏主界面", "软件缩到 Windows 系统托盘，提醒仍会继续工作。"),
    ("② 重新打开", "双击托盘里的“今日”图标，或右键图标后点“打开今日”。"),
    ("③ 设置开机启动", "右键托盘图标，勾选“开机自动启动”。再次点可取消。"),
    ("④ 真正退出", "右键托盘图标，选择“退出”。退出后后台提醒停止。"),
]
yy = 559
for title, body in flow:
    txt(59, yy, title, 8.8, GREEN_DARK, True)
    end = para(151, yy, 382, body, 8.1, 12, SUB)
    yy = max(yy + 33, end + 5)
card(58, 698, 477, 41, GOLD_PALE, None)
para(71, 708, 452, "退出后再次打开时，若之前有任务正在计时，软件会恢复剩余时间并暂停着，点“继续”即可。", 8, 11.5, GOLD)
c.showPage()


# PAGE 15 · Complete feature index and quick workflows
page_header(15, "功能索引：这本图册都讲到了", "按任务、时间、提醒和数据四类快速查找。遇到陌生按钮，可以从这里找到对应页面。", "快速查找")
cols = [
    (42, "任务与日期", [
        "当天 / 前一天 / 后一天：第 3 页",
        "添加、完成撤销、编辑、时间、备注、删除：第 4 页",
        "置顶、置底、仅看未完成：第 3–4 页",
        "批量添加、快捷日期、自定义范围：第 5 页",
        "重复任务和保存模板：第 4–6 页",
        "月历、拖动改期、移到今天：第 7 页",
        "多天、整月、全部清理：第 8 页",
    ]),
    (216, "专注与提醒", [
        "25 / 60 / 自定义专注时长：第 9 页",
        "任务计时、暂停续接、切换任务：第 9 页",
        "目标倒计时、重复目标和提醒：第 10 页",
        "任务闹钟、22:00 晚间提醒：第 11 页",
        "默认 / 自定义铃声、试听：第 11 页",
        "桌面独立悬浮窗、置顶、透明度：第 13 页",
    ]),
    (390, "记录与软件设置", [
        "任务记录、日期筛选、区间导出：第 12 页",
        "删单条、按日 / 月 / 全部清记录：第 12 页",
        "浅色 / 深色主题：第 14 页",
        "本机自动保存：第 14 页",
        "托盘重新打开、开机启动、退出：第 14 页",
        "安装版 / 便携版第一次使用：第 2 页",
    ]),
]
for x, title, entries in cols:
    card(x, 155, 163, 397, PAPER)
    txt(x + 13, 171, title, 10, INK, True)
    line(x + 13, 195, x + 150, 195)
    yy = 209
    for item in entries:
        yy = bullet(x + 13, yy, 137, item, 7.7, 11, SUB) + 5
card(42, 574, 511, 95, GREEN_PALE, None)
txt(58, 589, "最短上手路线", 9.7, GREEN_DARK, True)
para(58, 612, 477, "添加一项任务 → 点任务行的“计时”按钮 → 做完后点圆圈 → 在“任务记录”查看投入时间。若想按时收到提示，再点铃铛设置任务闹钟。", 8.6, 13, SUB)
card(42, 684, 511, 72, RED_PALE, None)
txt(58, 697, "清理前多看一眼", 9.2, RED, True)
para(58, 718, 477, "删除任务会连同它的记录一起删除；清空任务和清空记录是不同操作。批量清理会要求再点一次确认。", 8.1, 12, SUB)
c.showPage()

c.save()
print(OUT)

