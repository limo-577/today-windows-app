from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
from pathlib import Path
import os

ROOT = Path(r"D:\today-windows-app")
ASSET = ROOT / "tmp" / "pdfs" / "new-icons"
OUT = ROOT / "output" / "pdf" / "今日Windows软件使用说明图册-简明图解版.pdf"
OUT.parent.mkdir(parents=True, exist_ok=True)

W, H = A4
pdfmetrics.registerFont(TTFont("Guide", r"C:\Windows\Fonts\Deng.ttf"))
pdfmetrics.registerFont(TTFont("GuideBold", r"C:\Windows\Fonts\Dengb.ttf"))

BG = HexColor("#F5F6F1")
WHITE = HexColor("#FFFFFF")
INK = HexColor("#29332D")
SUB = HexColor("#4F5D53")
LINE = HexColor("#E1E6DF")
GREEN = HexColor("#6C8C70")
GREEN_D = HexColor("#4C6C50")
GREEN_P = HexColor("#E8F0E7")
BLUE = HexColor("#577E90")
BLUE_P = HexColor("#E9F0F4")
GOLD = HexColor("#B27B42")
GOLD_P = HexColor("#F5EFE3")
RED = HexColor("#AE5548")
RED_P = HexColor("#F6E9E5")
SHADOW = HexColor("#E9ECE7")

c = canvas.Canvas(str(OUT), pagesize=A4, pageCompression=1)
c.setTitle("今日 Windows 使用说明图册 - 新版图解版")
c.setAuthor("今日 Windows App")
c.setSubject("新版界面图解与常用操作")


def py(top):
    return H - top


def box(x, top, w, h, fill=WHITE, stroke=None, r=10, sw=0.8):
    c.setLineWidth(sw)
    c.setFillColor(fill)
    if stroke:
        c.setStrokeColor(stroke)
        c.roundRect(x, H - top - h, w, h, r, fill=1, stroke=1)
    else:
        c.roundRect(x, H - top - h, w, h, r, fill=1, stroke=0)


def rule(x1, t1, x2, t2, color=LINE, sw=0.8):
    c.setStrokeColor(color)
    c.setLineWidth(sw)
    c.line(x1, py(t1), x2, py(t2))


def arrow_right(x1, top, x2, color=GREEN, sw=1.1):
    y = py(top)
    c.setStrokeColor(color)
    c.setFillColor(color)
    c.setLineWidth(sw)
    c.line(x1, y, x2 - 4, y)
    p = c.beginPath()
    p.moveTo(x2, y)
    p.lineTo(x2 - 5, y + 3)
    p.lineTo(x2 - 5, y - 3)
    p.close()
    c.drawPath(p, stroke=0, fill=1)


def text(x, top, s, size=9, color=INK, bold=False, align="left"):
    f = "GuideBold" if bold else "Guide"
    c.setFont(f, size)
    c.setFillColor(color)
    wid = pdfmetrics.stringWidth(str(s), f, size)
    if align == "right":
        x -= wid
    elif align == "center":
        x -= wid / 2
    c.drawString(x, H - top - size, str(s))


def wrap(s, width, size=9, bold=False):
    f = "GuideBold" if bold else "Guide"
    out = []
    for para in str(s).split("\n"):
        cur = ""
        if not para:
            out.append("")
            continue
        for ch in para:
            if cur and pdfmetrics.stringWidth(cur + ch, f, size) > width:
                out.append(cur)
                cur = ch
            else:
                cur += ch
        if cur:
            out.append(cur)
    return out


def para(x, top, width, s, size=9, leading=13, color=SUB, bold=False):
    lines = wrap(s, width, size, bold)
    for i, ln in enumerate(lines):
        text(x, top + i * leading, ln, size, color, bold)
    return top + len(lines) * leading


def image(name, x, top, w, h):
    p = ASSET / name
    im = ImageReader(str(p))
    iw, ih = im.getSize()
    scale = min(w / iw, h / ih)
    dw, dh = iw * scale, ih * scale
    c.drawImage(im, x + (w - dw) / 2, H - top - (h + dh) / 2, width=dw, height=dh, mask="auto")


def card(x, top, w, h, fill=WHITE, stroke=LINE):
    box(x + 1, top + 2, w, h, SHADOW, None, 11)
    box(x, top, w, h, fill, stroke, 11)


def pill(x, top, label, active=False, color=GREEN, size=7.5, w=None, h=20):
    if w is None:
        w = pdfmetrics.stringWidth(label, "Guide", size) + 14
    box(x, top, w, h, color if active else HexColor("#F1F3EF"), None, h / 2)
    text(x + w / 2, top + (h - size) / 2 - 1, label, size, WHITE if active else SUB, active, "center")


def page_header(n, section, title, intro=""):
    c.setFillColor(BG)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    text(42, 19, "今日  /  使用说明图册", 8.5, GREEN_D, True)
    text(W - 42, 20, section, 9, SUB, False, "right")
    text(42, 48, title, 21, INK, True)
    if intro:
        para(42, 79, W - 84, intro, 10.5, 15.5, SUB)
    rule(42, 112, W - 42, 112, LINE, 0.9)
    rule(42, 807, W - 42, 807, LINE, 0.7)
    text(42, 815, "操作示意图 · 图标取自新版实际界面", 9, SUB)
    text(W - 42, 814, f"{n:02d} / 08", 8, GREEN_D, True, "right")


def draw_icon(name, x, top, size=22, color=GREEN_D, sw=1.7):
    """Small Lucide-style vector icons matching the app's row controls."""
    s = size / 24
    c.setStrokeColor(color)
    c.setFillColor(color)
    c.setLineWidth(sw)
    c.setLineCap(1)
    c.setLineJoin(1)

    def L(ax, ay, bx, by):
        c.line(x + ax*s, H - top - ay*s, x + bx*s, H - top - by*s)
    def C(cx, cy, r, fill=0):
        c.circle(x + cx*s, H - top - cy*s, r*s, fill=1 if fill else 0, stroke=0 if fill else 1)
    def P(points, close=False, fill=0):
        p = c.beginPath()
        p.moveTo(x + points[0][0]*s, H - top - points[0][1]*s)
        for ax, ay in points[1:]:
            p.lineTo(x + ax*s, H - top - ay*s)
        if close:
            p.close()
        c.drawPath(p, stroke=0 if fill else 1, fill=1 if fill else 0)

    if name == "plus":
        L(12, 4, 12, 20); L(4, 12, 20, 12)
    elif name == "check":
        c.setLineWidth(sw + .2); L(5, 13, 10, 18); L(10, 18, 20, 6)
    elif name == "bell":
        p = c.beginPath(); p.moveTo(x+3*s,H-top-15*s)
        p.curveTo(x+5*s,H-top-17*s,x+6*s,H-top-18*s,x+6*s,H-top-8*s)
        p.curveTo(x+6*s,H-top-2*s,x+18*s,H-top-2*s,x+18*s,H-top-8*s)
        p.curveTo(x+18*s,H-top-17*s,x+20*s,H-top-17*s,x+21*s,H-top-15*s)
        p.lineTo(x+3*s,H-top-15*s); c.drawPath(p,stroke=1,fill=0)
        p=c.beginPath(); p.moveTo(x+9*s,H-top-20*s); p.curveTo(x+10*s,H-top-17*s,x+14*s,H-top-17*s,x+15*s,H-top-20*s); c.drawPath(p,stroke=1,fill=0)
    elif name == "pencil":
        P([(3,20),(6,19),(20,5),(17,2),(3,16),(3,20)])
        L(14,5,18,9)
    elif name == "play":
        P([(7,4),(20,12),(7,20)], True, fill=1)
    elif name == "pause":
        box(x+6*s, top+4*s, 4*s, 16*s, color, None, 1.1*s)
        box(x+14*s, top+4*s, 4*s, 16*s, color, None, 1.1*s)
    elif name == "x":
        L(6,6,18,18); L(18,6,6,18)
    elif name == "pin":
        P([(9,4),(15,4),(15,10),(18,13),(18,15),(6,15),(6,13),(9,10),(9,4)])
        L(12,15,12,22)
    elif name == "reset":
        L(4,4,4,10); L(4,10,10,10)
        p=c.beginPath(); p.moveTo(x+4*s,H-top-9*s); p.curveTo(x+8*s,H-top-3*s,x+16*s,H-top-2*s,x+20*s,H-top-8*s); p.curveTo(x+23*s,H-top-14*s,x+19*s,H-top-20*s,x+13*s,H-top-20*s); c.drawPath(p,stroke=1,fill=0)
    elif name == "alarm":
        C(12,13,8); L(12,8,12,13); L(12,13,16,15); L(5,4,2,7); L(19,4,22,7)
    elif name == "chev-left":
        L(15,5,8,12); L(8,12,15,19)
    elif name == "chev-right":
        L(9,5,16,12); L(16,12,9,19)
    elif name == "calendar":
        box(x+3*s, top+4*s, 18*s, 18*s, WHITE, color, 2*s, sw)
        L(8,2,8,6); L(16,2,16,6); L(3,9,21,9)
        for ax in (8,12,16):
            for ay in (13,17): C(ax,ay,1.05,1)
    elif name == "batch":
        L(4,6,15,6); L(4,12,15,12); L(4,18,15,18)
        L(18,13,18,21); L(14,17,22,17)
    elif name == "records":
        box(x+4*s, top+5*s, 16*s, 17*s, WHITE, color, 2*s, sw)
        box(x+8*s, top+2*s, 8*s, 5*s, WHITE, color, 1.5*s, sw)
        L(8,11,10,11); L(12,11,17,11)
        L(8,15,10,15); L(12,15,17,15)
        L(8,19,10,19); L(12,19,17,19)
    elif name == "lock":
        p = c.beginPath(); p.moveTo(x+7*s,H-top-10*s)
        p.lineTo(x+7*s,H-top-7*s); p.curveTo(x+7*s,H-top-1*s,x+17*s,H-top-1*s,x+17*s,H-top-7*s)
        p.lineTo(x+17*s,H-top-10*s); c.drawPath(p,stroke=1,fill=0)
        box(x+4*s, top+10*s, 16*s, 12*s, WHITE, color, 2*s, sw)
    elif name == "download":
        L(12,3,12,15); L(7,10,12,15); L(12,15,17,10)
        L(5,17,5,21); L(5,21,19,21); L(19,21,19,17)
    elif name == "float":
        box(x+3*s, top+4*s, 15*s, 13*s, WHITE, color, 1.6*s, sw)
        box(x+8*s, top+8*s, 13*s, 12*s, WHITE, color, 1.6*s, sw)
    elif name == "sound":
        P([(3,9),(7,9),(12,5),(12,19),(7,15),(3,15)], True)
        p=c.beginPath(); p.moveTo(x+15*s,H-top-9*s); p.curveTo(x+19*s,H-top-11*s,x+19*s,H-top-13*s,x+15*s,H-top-15*s); c.drawPath(p,stroke=1,fill=0)
        p=c.beginPath(); p.moveTo(x+17*s,H-top-6*s); p.curveTo(x+23*s,H-top-9*s,x+23*s,H-top-15*s,x+17*s,H-top-18*s); c.drawPath(p,stroke=1,fill=0)
    elif name == "moon":
        p=c.beginPath(); p.moveTo(x+20*s,H-top-14*s)
        p.curveTo(x+18*s,H-top-5*s,x+11*s,H-top-1*s,x+5*s,H-top-5*s)
        p.curveTo(x+1*s,H-top-9*s,x+3*s,H-top-17*s,x+9*s,H-top-20*s)
        p.curveTo(x+7*s,H-top-13*s,x+13*s,H-top-8*s,x+20*s,H-top-14*s)
        c.drawPath(p,stroke=1,fill=0)
    elif name == "slider":
        L(4,7,20,7); L(4,17,20,17)
        C(9,7,2.2); C(15,17,2.2)
    elif name == "sun":
        C(12,12,4)
        for ax, ay, bx, by in [(12,1,12,5),(12,19,12,23),(1,12,5,12),(19,12,23,12),(4.2,4.2,7,7),(17,17,19.8,19.8),(4.2,19.8,7,17),(17,7,19.8,4.2)]:
            L(ax,ay,bx,by)


def numbered(x, top, n, color=GREEN):
    c.setFillColor(color)
    c.circle(x, H-top-9, 9, fill=1, stroke=0)
    text(x, top+3, str(n), 8, WHITE, True, "center")


def tiny_bullet(x, top, s, width, color=SUB, dot=GREEN, size=8.2, leading=11.5):
    c.setFillColor(dot)
    c.circle(x+3, H-top-size*.65, 2, fill=1, stroke=0)
    return para(x+12, top, width-12, s, size, leading, color) + 3


# 0 · Overview: explain what the app is for, then map actual toolbar icons.
page_header(1, "先看整体", "先看整块面板：今天的事在这里安排", "今日把待办、提醒、专注计时和完成记录放在一个轻巧的桌面面板里。")

# Reconstructed full panel with the actual current toolbar image.
card(42, 127, 236, 331, WHITE)
image("actual-toolbar.png", 51, 143, 218, 34)
box(52, 181, 216, 43, GREEN_P, None, 8)
draw_icon("alarm", 61, 190, 18, GREEN_D, 1.4)
text(85, 188, "下班", 8, INK, True)
text(85, 202, "还有 06:24:18", 10.5, INK, True)
text(257, 195, "18:00", 6.8, GREEN_D, True, "right")
text(63, 231, "今天", 9.5, INK, True)
text(255, 233, "2026年11月2日 · 周一", 6.7, SUB, False, "right")
pill(53, 250, "＋ 添加任务", active=True, w=71, h=20, size=6.4)
pill(130, 250, "未完成置顶", w=62, h=20, size=6.2)
pill(197, 250, "仅未完成", w=71, h=20, size=6.2)
for i, (tm, label, done) in enumerate([("09:00", "晨会准备", False), ("11:30", "回复邮件", True), ("", "喝水伸展", False)]):
    yy = 279 + i * 39
    box(53, yy, 215, 34, HexColor("#FAFBF8"), LINE, 5)
    c.setStrokeColor(GREEN if done else SUB); c.setLineWidth(1)
    c.circle(64, H-yy-17, 5, fill=0, stroke=1)
    if done: draw_icon("check", 59, yy+11, 10, GREEN, 1.3)
    text(75, yy+6, tm, 6.3, SUB)
    text(105, yy+5, label, 7.8, SUB if done else INK, not done)
    draw_icon("bell", 224, yy+9, 12, GREEN_D, 1.25)
    draw_icon("pencil", 242, yy+9, 12, SUB, 1.25)
    draw_icon("play", 258, yy+9, 11, SUB, 1.25)
box(53, 404, 215, 42, HexColor("#F6F7F3"), None, 7)
text(65, 409, "专注", 6.7, SUB, True)
text(160, 414, "25:00", 17, INK, True, "center")
draw_icon("play", 242, 416, 15, GREEN_D, 1.5)

# Four short benefit callouts, aligned to the areas shown in the panel.
intro_cards = [
    (178, "check", "写下任务", "名称、时间和备注集中管理。", GREEN_D),
    (244, "bell", "及时提醒", "设任务闹钟，避免忘记。", BLUE),
    (310, "play", "专注完成", "专注计时，记录投入时长。", GOLD),
    (376, "records", "回看进度", "日历看日期安排，记录看专注时长。", GREEN_D),
]
text(299, 133, "从记录到完成，跟着面板走", 12.5, INK, True)
text(299, 151, "未完成置顶只调顺序；仅未完成会隐藏已完成。", 10.5, SUB)
for yy, ico, title, body, col in intro_cards:
    arrow_right(280, yy+28, 298, col, 1)
    card(299, yy, 254, 57, WHITE)
    draw_icon(ico, 313, yy+17, 20, col)
    text(344, yy+8, title, 12, INK, True)
    para(344, yy+30, 195, body, 10.5, 15, SUB)

text(42, 475, "顶部 8 个按钮：下方放大图标，方便对照", 12.5, INK, True)
icon_items = [
    ("batch", "批量添加计划", "一口气安排多天"),
    ("calendar", "日历视图", "按日期看、挪任务"),
    ("records", "任务记录", "查看 / 导出任务记录"),
    ("lock", "密码与自动锁", "保护本机数据"),
    ("download", "备份与恢复", "整份数据导出 / 导入"),
    ("float", "独立悬浮窗", "桌面小窗，状态同步"),
    ("sound", "提醒铃声", "选系统音或自定义"),
    ("moon", "切换主题", "浅色、深色切换"),
]
for i, (iconname, title, body) in enumerate(icon_items):
    col, row = i % 4, i // 4
    xx, yy = 42 + col * 130, 499 + row * 126
    card(xx, yy, 121, 115, WHITE)
    draw_icon(iconname, xx+42, yy+10, 36, GREEN_D if iconname == "lock" else "#858A82", 1.5)
    text(xx+60.5, yy+50, title, 10.5, INK, True, "center")
    para(xx+9, yy+73, 103, body, 10.5, 15, SUB)
c.showPage()


# 1 · Main panel: task controls, Pomodoro and target countdown.
page_header(2, "1 主面板", "1  主面板：添加任务、看懂图标、开始专注", "按这个顺序用：加任务 → 补充细节 → 需要时设提醒 / 开始计时。")
card(42, 126, 511, 44, WHITE)
draw_icon("plus", 56, 139, 20, GREEN)
text(84, 137, "添加任务", 11.5, GREEN_D, True)
box(159, 133, 260, 29, HexColor("#F4F5F1"), None, 7)
text(170, 141, "例如：09:00 晨会准备", 10.5, SUB)
pill(432, 135, "添加", active=True, w=102, h=24, size=10.5)

card(42, 178, 511, 56, WHITE)
text(56, 187, "任务行示意", 9.5, SUB, True)
c.setStrokeColor(SUB); c.setLineWidth(1.3); c.circle(68, H-217, 7, fill=0, stroke=1)
pill(84, 204, "09:00", size=9, h=20)
text(138, 205, "09:00 晨会准备", 11.5, INK, True)
text(138, 220, "备注：会前资料、流程与联系人", 9.5, SUB)
draw_icon("bell", 424, 198, 18, GREEN_D)
draw_icon("pencil", 455, 198, 18, SUB)
draw_icon("play", 486, 198, 18, SUB)
draw_icon("x", 517, 198, 18, SUB)
actions = [(42,"bell","提醒","设置此任务提醒。"),(172,"pencil","编辑","修改名称、时间、备注。"),(302,"play","开始计时","开始或暂停此任务。"),(432,"x","删除","删除任务，也会删除它的专注记录。")]
for x, ico, title, body in actions:
    card(x, 242, 121, 70, RED_P if ico=="x" else WHITE)
    draw_icon(ico, x+11, 251, 18, RED if ico=="x" else (GREEN_D if ico=="bell" else SUB))
    text(x+35, 253, title, 11.5, RED if ico=="x" else INK, True)
    para(x+10, 276, 101, body, 10.5, 15, RED if ico=="x" else INK, ico=="x")

card(42, 321, 244, 164, WHITE)
text(57, 332, "编辑任务", 12.5, INK, True)
for yy, label, value, hh in [(356,"任务内容","09:00 晨会准备",25),(400,"计划时间","09:00（可留空）",25),(444,"备注 / 细节","资料、步骤、联系人……",25)]:
    text(57, yy, label, 9.5, SUB)
    box(57, yy+13, 214, hh, HexColor("#F4F5F1"), None, 6)
    text(65, yy+20, value, 10.5, INK)

card(300, 321, 253, 164, GREEN_P, None)
text(316, 332, "底部番茄钟（独立倒计时）", 12.5, GREEN_D, True)
pill(316, 354, "25 分钟", active=True, w=67, h=21, size=9.5)
pill(389, 354, "60 分钟", w=67, h=21, size=9.5)
pill(462, 354, "自定义", w=70, h=21, size=9.5)
text(425, 389, "25:00", 23, INK, True, "center")
draw_icon("reset", 350, 393, 17, SUB)
box(475, 386, 31, 31, GREEN, None, 16)
draw_icon("play", 481, 392, 19, WHITE, 1.5)
text(316, 429, "选时长 → 点播放；点重置回起点。", 10.5, INK, True)
text(316, 448, "自定义范围：1–1440 分钟。", 10.5, INK, True)

# Target countdown: detailed visual form, still part of the main panel.
text(57, 489, "底部播放＝独立倒计时；不关联任务，也不生成任务记录。", 10.5, INK, True)
text(57, 507, "任务行播放＝计时归属该任务，时长记入任务记录。", 10.5, INK, True)
card(42, 526, 511, 261, GOLD_P, None)
draw_icon("alarm", 58, 538, 22, GOLD)
text(88, 540, "目标倒计时：盯住一个重要时刻", 12.5, INK, True)
text(88, 559, "点主面板目标倒计时区域，新增或管理目标。", 10.5, SUB)
card(57, 581, 228, 185, WHITE)
box(68, 594, 205, 25, HexColor("#F4F5F1"), None, 6); text(77, 601, "名称：下班", 9.5, INK)
text(69, 626, "目标时间", 9.5, SUB); box(132, 622, 141, 24, HexColor("#F4F5F1"), None, 6); text(142, 628, "18:00", 9.5, INK)
text(69, 656, "重复", 9.5, SUB)
pill(111, 650, "每天", active=True, w=43, h=20, size=8.5)
pill(159, 650, "每周", w=43, h=20, size=8.5)
pill(207, 650, "每月", w=48, h=20, size=8.5)
text(69, 681, "提前提醒", 9.5, SUB); box(132, 676, 54, 24, HexColor("#F4F5F1"), None, 6); text(141, 682, "30", 9.5, INK); text(190, 682, "分钟", 9.5, SUB)
box(69, 710, 10, 10, GREEN, None, 2); draw_icon("check", 69, 709, 10, WHITE, 1.2); text(85, 709, "到点再提醒", 9.5, INK)
pill(189, 740, "添加倒计时", active=True, w=73, h=19, size=8.5)
text(304, 588, "三步设好", 12, GOLD, True)
numbered(313, 613, 1, GOLD); text(331, 615, "写名称和目标时间", 10.5, INK, True)
numbered(313, 640, 2, GOLD); text(331, 642, "选每天 / 每周 / 每月", 10.5, INK, True)
numbered(313, 667, 3, GOLD); text(331, 669, "填提前分钟；可选到点提醒", 10.5, INK, True)
rule(304, 699, 537, 699, HexColor("#E8DCC6"))
para(304, 711, 232, "每周可指定星期；每月可设日期。已建目标可编辑、暂停 / 启用或删除。", 10.5, 15.5, INK)
text(304, 762, "面板显示最近目标和剩余时间。", 10.5, GREEN_D, True)
c.showPage()


# 2 · Calendar and move unfinished tasks
page_header(3, "2 日历", "2  日历视图：查看日期，把昨天没完成的任务移到今天", "点击顶部日历图标；点某一天，右侧显示当天任务。")
card(42, 132, 511, 395, WHITE)
image("calendar.png", 57, 144, 35, 35)
text(101, 150, "2026 年 11 月", 12.5, INK, True)
text(535, 152, "← 上月       下月 →", 10.5, SUB, False, "right")
rule(57, 184, 538, 184)
calendar_x, calendar_top, cell_w = 57, 199, 42
for i, wd in enumerate(["一","二","三","四","五","六","日"]):
    text(calendar_x+i*cell_w+16, calendar_top, wd, 10.5, INK, True, "center")
days = [None,None,None,None,None,None,1] + list(range(2,31))
for i, d in enumerate(days[:35]):
    row, col = divmod(i,7)
    x, top = calendar_x+col*cell_w, calendar_top+18+row*52
    if d is None: continue
    if d == 1:
        box(x+1, top, 39, 47, GOLD_P, None, 6)
    elif d == 2:
        box(x+1, top, 39, 47, GREEN_P, None, 6)
    text(x+21, top+5, str(d), 10.5, GOLD if d==1 else (GREEN_D if d==2 else INK), d in (1,2), "center")
    if d == 1:
        box(x+4, top+23, 33, 15, GOLD, None, 3)
        text(x+20, top+24, "未完成", 7.5, WHITE, True, "center")
    if d == 2:
        box(x+4, top+23, 33, 15, GREEN, None, 3)
        text(x+20, top+24, "今天", 7.5, WHITE, True, "center")

# Right-hand date detail and move button.
side_x = 361
rule(350, 188, 350, 512, LINE, 1)
text(side_x, 200, "昨天 · 11 月 1 日", 11.5, INK, True)
text(side_x, 220, "1 项未完成", 10.5, GOLD, True)
box(side_x, 244, 174, 52, GOLD_P, None, 7)
text(side_x+10, 260, "09:00 晨会准备", 10.5, INK, True)
pill(side_x, 307, "移到今天", active=True, w=174, h=31, size=10.5)
text(side_x+87, 342, "↓", 17, GREEN_D, True, "center")
text(side_x, 370, "今天 · 11 月 2 日", 11.5, INK, True)
box(side_x, 396, 174, 52, GREEN_P, None, 7)
text(side_x+10, 412, "09:00 晨会准备", 10.5, GREEN_D, True)

card(42, 545, 511, 211, BLUE_P, None)
text(59, 559, "昨天的任务没做完？按箭头走", 12.5, BLUE, True)
steps = [(58,"选中昨天"),(179,"确认未完成"),(300,"点“移到今天”"),(421,"看今天列表")]
for i,(xx,label) in enumerate(steps):
    card(xx, 585, 113, 52, WHITE, HexColor("#D5E1E7"))
    numbered(xx+16, 598, i+1, BLUE)
    text(xx+34, 600, label, 10.5, INK, True)
    if i < 3: arrow_right(xx+114, 610, xx+121, BLUE, 1)
text(59, 650, "可逐项移动；点“全部未完成移到今天”可一次搬完。", 10.5, INK, True)
text(59, 677, "注意：已完成任务不会移动。", 10.5, RED, True)
text(59, 706, "改期也可按住月历中的任务标签，拖到目标日期格。", 10.5, BLUE, True)
c.showPage()


# 3 · Batch planning
page_header(4, "3 批量添加任务", "3  批量添加任务：一行一项，一次安排多天", "点击顶部列表加号图标打开。")
image("batch.png", 43, 126, 34, 34)
text(84, 138, "批量添加计划", 12.5, INK, True)

card(42, 176, 288, 574, WHITE)
text(58, 192, "批量添加计划", 12, INK, True)
box(58, 218, 256, 70, HexColor("#F4F5F1"), None, 8)
text(70, 229, "09:00 晨会准备", 11.5, INK, True)
text(70, 250, "11:30 回复邮件", 11.5, INK, True)
text(70, 270, "一行一项；时间可留空。", 10.5, SUB)
text(58, 298, "重复方式", 10.5, SUB, True)
pill(58, 313, "不重复", active=True, w=58, h=25, size=9.5)
pill(122, 313, "每天", w=47, h=25, size=9.5)
pill(175, 313, "工作日", w=63, h=25, size=9.5)
pill(58, 343, "每周指定星期", w=112, h=25, size=9.5)
text(58, 376, "日期快捷选", 10.5, SUB, True)
pill(58, 391, "今天", w=54, h=24, size=9.5)
pill(119, 391, "明天", w=54, h=24, size=9.5)
pill(180, 391, "未来 7 天", w=100, h=24, active=True, size=9.5)
pill(58, 420, "未来 30 天", w=103, h=24, size=9.5)
pill(168, 420, "自定义日期范围", w=137, h=24, size=9.5)
text(58, 453, "选择日期 · 2026 年 11 月", 10.5, SUB, True)
calx, caltop, cw = 58, 470, 34
for i,wd in enumerate(["一","二","三","四","五","六","日"]):
    text(calx+i*cw+12, caltop, wd, 9.5, SUB, True, "center")
for i,d in enumerate(range(1,31)):
    row,col=divmod(i,7); xx=calx+col*cw; tt=caltop+17+row*25
    if d in (2,3,4,5): box(xx+2,tt,27,22,GREEN_P,None,5)
    text(xx+15,tt+5,str(d),9.2, GREEN_D if d in (2,3,4,5) else INK, d in (2,3,4,5), "center")
pill(58, 618, "添加到 4 天", active=True, w=256, h=30, size=11)
text(58, 654, "已点亮 11 月 2、3、4、5 日，共 4 天。", 10.5, GREEN_D, True)
text(58, 688, "已保存重复计划：展开后管理", 10.5, SUB, True)

card(348, 176, 205, 205, GREEN_P, None)
numbered(366, 191, 1)
text(384, 193, "写任务", 12.5, GREEN_D, True)
para(363, 222, 173, "一行写一项；在开头写 09:00 可添加计划时间。", 10.5, 15.5, INK)
numbered(366, 290, 2)
text(384, 292, "选日期和重复", 12.5, GREEN_D, True)
para(363, 321, 173, "可选每天、工作日或每周指定星期；选每周时，再点亮要重复的星期。", 10.5, 15.5, INK)
card(348, 395, 205, 160, BLUE_P, None)
numbered(366, 410, 3, BLUE)
text(384, 412, "确认并添加", 12.5, BLUE, True)
para(363, 442, 173, "按钮显示选中的日期数量。点亮 4 天，按钮就显示“添加到 4 天”。", 10.5, 15.5, INK)
text(363, 516, "自定义日期范围最多 3 年。", 10.5, RED, True)
card(348, 570, 205, 186, BLUE_P, None)
text(364, 586, "已保存重复计划", 12.5, BLUE, True)
para(364, 613, 173, "展开后可编辑、暂停 / 恢复或删除。", 10.5, 15.5, INK)
rule(364, 661, 536, 661, HexColor("#D5E1E7"))
box(361, 676, 178, 66, WHITE, HexColor("#D5E1E7"), 7)
para(371, 685, 158, "注意：暂停或删除模板，不会删除已经生成的任务。", 10.5, 15.5, INK, True)
c.showPage()


# 4 · Task records, export and cleanup
page_header(5, "4 任务记录", "4  任务记录：筛选、导出和清理", "点击顶部剪贴板图标；任务记录按日期分组。")
image("records.png", 43, 127, 33, 33)
text(83, 138, "任务记录", 12.5, INK, True)
card(42, 175, 320, 345, WHITE)
text(58, 190, "任务记录", 12, INK, True)
box(58, 215, 288, 32, HexColor("#F4F5F1"), None, 6)
text(69, 224, "全部日期  /  开始日期  至  结束日期", 10.5, SUB)
text(58, 258, "共 8 条 · 总计 4 小时 20 分", 10.5, SUB, True)
pill(244, 253, "导出 CSV", active=True, w=102, h=27, size=10.5)
rule(58, 290, 346, 290)
text(60, 301, "2026-11-02 · 共 55 分钟", 10.5, GREEN_D, True)
text(66, 322, "09:12–09:37  晨会准备", 10.5, INK)
text(66, 342, "10:03–10:33  回复邮件", 10.5, INK)
text(340, 322, "25分", 9.5, SUB, False, "right")
text(340, 342, "30分", 9.5, SUB, False, "right")
rule(58, 365, 346, 365)
text(60, 376, "2026-11-01 · 共 18 分钟", 10.5, GREEN_D, True)
text(66, 397, "15:00–15:18  喝水伸展", 10.5, INK)
text(340, 397, "18分", 9.5, SUB, False, "right")
text(58, 425, "下方仅列部分示例记录。", 10.5, SUB)
box(58, 451, 288, 57, RED_P, None, 7)
text(68, 459, "注意：导出只包含当前筛选结果。", 10.5, RED, True)
text(68, 480, "CSV 可用 Excel 打开。", 10.5, INK)

card(377, 175, 176, 345, BLUE_P, None)
text(392, 192, "导出 CSV", 12.5, BLUE, True)
numbered(400, 222, 1, BLUE); text(418,224,"选日期",11.5,INK,True)
para(418,246,142,"选单日，或填写起止日期。",10.5,15.5,INK)
numbered(400, 293, 2, BLUE); text(418,295,"点“导出 CSV”",11.5,INK,True)
para(418,317,142,"文件包含日期、任务、开始、结束和时长（秒）。",10.5,15.5,INK)
rule(392, 378, 538, 378, HexColor("#D7E2E8"))
text(392, 391, "导入说明", 12, BLUE, True)
para(392, 416, 146, "此窗口只导出 CSV，不单独导入。整份数据恢复见第 6 节：备份与恢复。",10.5,15.5,INK)

card(42, 536, 511, 220, RED_P, None)
text(58, 551, "清理记录", 12.5, RED, True)
pill(58, 578, "单条记录 ×", w=112, h=30, size=10.5)
pill(178, 578, "清空该日", w=112, h=30, size=10.5)
pill(298, 578, "清空该月", w=112, h=30, size=10.5)
pill(418, 578, "清空全部记录", w=117, h=30, size=9.5, color=RED)
text(58, 620, "选择日期 / 月份后再点对应的清理按钮。", 10.5, INK)
text(58, 646, "勾选完成也会留记录；如果没有计时，时长显示 0 秒。", 10.5, INK, True)
box(58, 675, 477, 64, WHITE, HexColor("#E7C8C2"), 7)
para(69, 684, 455, "注意：按钮先变成“确定？”或“再点一次”提示，再点一次才会清理。删除任务会连同该任务的专注记录一起删除。", 10.5, 15.5, RED, True)
c.showPage()


# 5 · Independent floating window
page_header(6, "5 独立悬浮窗", "5  独立悬浮窗：放在桌面一角，操作会同步", "点击顶部悬浮窗图标打开；主面板仍可继续使用。")
image("float.png", 43, 126, 35, 35)
text(85, 138, "打开独立悬浮窗", 12.5, INK, True)

# A clearly labeled desktop mockup; the bars are example app windows, not screenshots.
card(42, 178, 511, 395, HexColor("#EEF1EC"), LINE)
box(66, 211, 267, 315, HexColor("#DDE3DD"), None, 12)
text(82, 229, "桌面其他软件示意（非真实截图）", 10.5, SUB, True)
rule(82, 255, 318, 255, HexColor("#CBD3CA"))
for yy, label in [(278,"浏览器网页"),(319,"文档 / 表格"),(360,"邮件 / 聊天"),(401,"其他软件窗口")]:
    box(82, yy, 221, 29, WHITE, None, 5)
    text(96, yy+8, label, 10.5, SUB)
box(351, 229, 176, 287, WHITE, HexColor("#D7DED5"), 12)
box(351, 229, 176, 34, HexColor("#F3F5F1"), None, 11)
draw_icon("pin", 362, 236, 18, GREEN_D)
rule(390, 245, 406, 245, SUB, 1.3)
rule(390, 250, 406, 250, SUB, 1.3)
rule(428, 246, 484, 246, SUB, 1.3)
c.setFillColor(GREEN_D); c.circle(457, H-246, 4, fill=1, stroke=0)
numbered(477, 232, 3, BLUE)
draw_icon("x", 503, 236, 17, SUB)
text(439, 278, "09:41:26", 19, INK, True, "center")
rule(362, 308, 516, 308)
for i,(time_,task) in enumerate([("09:00","晨会准备"),("11:30","回复邮件"),("","喝水伸展")]):
    yy=324+i*42
    c.setStrokeColor(SUB); c.setLineWidth(1.2); c.circle(369, H-(yy+10), 6, fill=0, stroke=1)
    text(384,yy+5,time_ or "",9.5,SUB)
    text(418,yy+5,task,10.5,INK)
    box(497,yy,20,20,GREEN_P,None,10)
    draw_icon("play", 500, yy+3, 14, GREEN_D, 1.4)
text(439, 464, "只显示未完成任务", 10.5, SUB, False, "center")
text(439, 488, "左侧空圈：点按完成", 10.5, GREEN_D, True, "center")

controls=[
    (42,"pin","置顶","点图钉置顶或取消置顶。"),
    (172,"play","开始计时","进度与主面板同步。"),
    (302,"slider","③ 透明度","拖动顶栏右侧滑杆调节。"),
    (432,"x","关闭悬浮窗","只关小窗，“今日”仍运行。"),
]
for x,ico,title,body in controls:
    card(x, 590, 121, 119, RED_P if ico=="x" else WHITE)
    draw_icon(ico,x+13,604,19,RED if ico=="x" else (GREEN_D if ico=="pin" else SUB))
    text(x+40,606,title,10.5,RED if ico=="x" else INK,True)
    para(x+12,635,98,body,10.5,15,RED if ico=="x" else INK,ico=="x")
card(42, 721, 511, 58, BLUE_P, None)
para(58, 733, 479, "拖动顶部把手，可移到桌面角落或另一显示器。点任务左侧空圈即可标记完成，状态会同步到主面板。", 10.5, 15.5, INK, True)
c.showPage()


# 6-1 · Auxiliary features: password and backup.
page_header(7, "6-1 辅助功能", "6-1  密码与自动锁、备份与恢复", "锁用于保护本机数据；备份用于迁移或恢复整份数据。")

card(42, 130, 244, 488, WHITE)
image("lock.png", 55, 143, 26, 26)
text(88, 151, "密码与自动锁", 12.5, GREEN_D, True)
image("actual-lock-dialog.png", 48, 173, 232, 315)
box(50, 496, 228, 50, RED_P, None, 7)
text(60, 499, "密码以不可逆加密结果保存，不保存明文。", 10.5, RED, True)
text(60, 515, "注意：软件没有找回密码功能。", 10.5, RED, True)
text(60, 531, "忘记密码无法找回，请牢记。", 10.5, RED, True)
para(57, 551, 212, "首次设置：新密码至少 4 个字符，确认框再输入相同密码后保存。", 10.5, 15.5, INK)
para(57, 585, 212, "电脑锁屏、睡眠或重启“今日”后自动锁定；修改或关闭保护前，需输入当前密码。", 10.5, 15.5, INK, True)

card(300, 130, 253, 488, WHITE)
image("backup.png", 314, 143, 26, 26)
text(348, 151, "备份与恢复", 12.5, GREEN_D, True)
image("actual-backup-dialog.png", 308, 176, 237, 190)
rule(315, 374, 538, 374)
text(315, 386, "导出内容", 12, GREEN_D, True)
text(315, 412, "文件格式：.todaybackup", 10.5, INK, True)
para(315, 434, 222, "包含任务、完成状态、专注记录、目标倒计时、列表设置、主题、密码保护设置和自定义提醒铃声。", 10.5, 15.5, INK)
para(315, 510, 222, "弹窗列出的备份内容未提到悬浮窗位置 / 透明度设置。", 10.5, 15.5, BLUE, True)

card(42, 637, 511, 119, GOLD_P, None)
text(58, 650, "迁移 / 恢复顺序", 12.5, INK, True)
pill(58, 678, "① 导出全部配置与数据", active=True, w=151, h=29, size=9.5)
arrow_right(211, 693, 219, GOLD, 1.2)
pill(222, 678, "② 点“导入备份”", w=139, h=29, size=9.5)
arrow_right(362, 693, 370, GOLD, 1.2)
pill(373, 678, "③ 等待自动重启", w=162, h=29, size=9.5)
box(58, 716, 477, 29, RED_P, None, 6)
text(68, 723, "导入前先导出当前数据。导入会覆盖现有数据，并自动重启软件。", 10.5, RED, True)
c.showPage()

# 6-2 · Auxiliary features: reminder sound and theme.
page_header(8, "6-2 辅助功能", "6-2  提醒铃声、切换主题", "都从顶部图标打开或切换；设置完可继续回主面板使用。")

card(42, 132, 244, 430, WHITE)
image("sound.png", 58, 150, 36, 36)
text(105, 160, "提醒铃声", 12.5, INK, True)
text(58, 205, "第 1 步：先选一种声音", 10.5, SUB, True)
box(58, 231, 212, 42, GREEN, None, 8)
text(164, 245, "Windows 默认提示音", 10.5, WHITE, True, "center")
box(58, 282, 212, 42, HexColor("#F1F3EF"), None, 8)
text(164, 296, "选择自定义铃声…", 10.5, INK, True, "center")
text(58, 344, "第 2 步：选好自定义音后试听", 10.5, SUB, True)
box(58, 368, 212, 42, HexColor("#F1F3EF"), None, 8)
text(164, 382, "试听铃声", 10.5, INK, True, "center")
box(58, 425, 212, 119, BLUE_P, None, 7)
para(69, 436, 190, "支持 MP3 / WAV / M4A / OGG。文件会复制到软件数据目录；移动或删除原文件后，铃声仍可用。", 10.5, 15.5, INK, True)

card(300, 132, 253, 430, BLUE_P, None)
image("theme.png", 316, 150, 36, 36)
text(363, 160, "切换主题", 12.5, INK, True)
text(316, 205, "点击顶部图标切换：", 10.5, SUB)
card(317, 233, 219, 98, WHITE)
image("theme.png", 337, 252, 36, 36)
text(390, 250, "浅色界面", 10.5, INK, True)
text(390, 272, "点月亮 → 切到深色", 10.5, SUB)
rule(342, 343, 508, 343, BLUE, 1.2)
text(425, 350, "图标表示切换目标，不是当前主题", 10.5, BLUE, True, "center")
card(317, 378, 219, 98, HexColor("#303632"), HexColor("#4A554D"))
draw_icon("sun", 337, 397, 36, WHITE, 1.5)
text(390, 395, "深色界面", 10.5, WHITE, True)
text(390, 417, "点太阳 → 切到浅色", 10.5, HexColor("#D5DED5"))
para(317, 499, 219, "切换立即生效并保留所选主题；只改明暗，不会改动任务、记录或提醒设置。", 10.5, 15.5, BLUE, True)

card(42, 584, 511, 172, WHITE)
text(59, 600, "记住这两组入口", 12.5, INK, True)
image("sound.png", 65, 628, 36, 36)
text(108, 629, "提醒铃声", 11.5, GREEN_D, True)
para(108, 650, 188, "铃声控制“提醒时放什么声”；任务铃铛控制“几点提醒”。", 10.5, 15.5, INK, True)
image("theme.png", 317, 628, 36, 36)
text(361, 629, "月亮 / 太阳", 11.5, BLUE, True)
para(361, 650, 172, "月亮切深色，太阳切浅色；图标表示目标主题。", 10.5, 15.5, INK, True)
rule(59, 691, 536, 691)
text(59, 706, "设置入口在顶部工具栏；点右上角 × 关闭弹窗，回到主面板。", 10.5, SUB)

c.save()
print(OUT)

