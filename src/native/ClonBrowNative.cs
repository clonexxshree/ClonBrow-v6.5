using System;
using System.Diagnostics;
using System.Drawing;
using System.Windows.Forms;

namespace ClonBrowNative {
    static class Program {
        [STAThread] static void Main() {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new HomeWindow());
        }
    }

    sealed class HomeWindow : Form {
        readonly Color ink = Color.FromArgb(15, 23, 42);
        readonly Color muted = Color.FromArgb(100, 116, 139);
        readonly Color purple = Color.FromArgb(111, 76, 255);
        FlowLayoutPanel page;

        public HomeWindow() {
            Text = "ClonBrow | For students, by a student";
            StartPosition = FormStartPosition.CenterScreen;
            MinimumSize = new Size(900, 650);
            Size = new Size(1220, 850);
            BackColor = Color.White;
            Font = new Font("Segoe UI", 10F);

            Panel header = new Panel { Dock = DockStyle.Top, Height = 68, BackColor = Color.White };
            Label brand = new Label { Text = "✦  ClonBrow", AutoSize = true, Location = new Point(30, 20), Font = new Font("Segoe UI Semibold", 16F), ForeColor = ink };
            header.Controls.Add(brand);
            FlowLayoutPanel nav = new FlowLayoutPanel { Dock = DockStyle.Right, Width = 500, Padding = new Padding(0, 15, 12, 0), WrapContents = false };
            nav.Controls.Add(Nav("Features", "features"));
            nav.Controls.Add(Nav("Compatibility", "compatibility"));
            nav.Controls.Add(Nav("Vision", "vision"));
            nav.Controls.Add(Button("Open ClonBrow", Color.Black, Color.White, delegate { Open("https://clonbrow.netlify.app/"); }));
            header.Controls.Add(nav);
            Controls.Add(header);

            page = new FlowLayoutPanel { Dock = DockStyle.Fill, AutoScroll = true, FlowDirection = FlowDirection.TopDown, WrapContents = false, BackColor = Color.White };
            page.SizeChanged += delegate { foreach (Control c in page.Controls) c.Width = Math.Max(600, page.ClientSize.Width - 25); };
            Controls.Add(page);
            AddHero(); AddFeatures(); AddCompatibility(); AddTools(); AddVision(); AddFooter();
        }

        Button Nav(string text, string section) { return Button(text, Color.White, muted, delegate { Control c = page.Controls[section]; if (c != null) page.ScrollControlIntoView(c); }); }
        Button Button(string text, Color background, Color foreground, Action click) {
            Button b = new Button { Text = text, AutoSize = true, Height = 38, FlatStyle = FlatStyle.Flat, BackColor = background, ForeColor = foreground, Font = new Font("Segoe UI Semibold", 9.5F), Padding = new Padding(13, 2, 13, 2), Margin = new Padding(5, 0, 5, 0), Cursor = Cursors.Hand };
            b.FlatAppearance.BorderSize = 0; b.Click += delegate { click(); }; return b;
        }
        Label TextLabel(string text, float size, Color color, bool bold) { return new Label { Text = text, AutoSize = true, ForeColor = color, Font = new Font(bold ? "Segoe UI Semibold" : "Segoe UI", size), MaximumSize = new Size(900, 0) }; }
        Panel Section(string name, int height, Color color) { Panel p = new Panel { Name = name, Height = height, BackColor = color, Padding = new Padding(70, 42, 70, 32), Margin = new Padding(0) }; page.Controls.Add(p); return p; }
        void At(Panel parent, Control child, int x, int y) { child.Location = new Point(x, y); parent.Controls.Add(child); }
        void AddAction(Panel p, string text, int x, int y, Color bg, Color fg, Action click) { Button b = Button(text, bg, fg, click); b.Location = new Point(x, y); p.Controls.Add(b); }

        void AddHero() {
            Panel p = Section("home", 475, Color.FromArgb(248, 249, 252));
            At(p, TextLabel("FOR STUDENTS, BY A STUDENT", 10, purple, true), 72, 46);
            At(p, TextLabel("A calmer way\nto learn and focus.", 42, ink, true), 70, 84);
            Label desc = TextLabel("ClonBrow brings focused searching and useful study tools together, so you can spend less time switching between apps and more time learning.", 15, muted, false); desc.MaximumSize = new Size(500, 0); At(p, desc, 74, 225);
            AddAction(p, "Try ClonBrow online  →", 74, 325, purple, Color.White, delegate { Open("https://clonbrow.netlify.app/"); });
            AddAction(p, "Get the laptop app", 278, 325, Color.White, ink, delegate { Open("https://drive.google.com/drive/folders/1PyECsoYagZZe8G8rzdzDlejmpBczKhoqK?usp=sharing"); });
            Panel art = new Panel { Location = new Point(640, 75), Size = new Size(390, 270), BackColor = Color.FromArgb(235, 230, 255) };
            art.Paint += delegate(object s, PaintEventArgs e) { using (Font f = new Font("Segoe UI Semibold", 22F)) e.Graphics.DrawString("Study in your flow", f, new SolidBrush(ink), 30, 35); using (Font f = new Font("Segoe UI", 11F)) e.Graphics.DrawString("Search  ·  Learn  ·  Keep going", f, new SolidBrush(muted), 34, 78); };
            p.Controls.Add(art);
        }

        void AddFeatures() {
            Panel p = Section("features", 360, Color.White);
            At(p, TextLabel("BUILT FOR SPEED & FOCUS", 10, purple, true), 72, 32);
            At(p, TextLabel("Everything you need to stay in the zone.", 28, ink, true), 70, 64);
            string[,] cards = { { "01", "Distraction-free searching", "Find what you need without ads or noise getting in the way." }, { "02", "A built-in study toolkit", "Keep sessions, flashcards, notes and practice in one place." }, { "03", "Offline progress saving", "Pick up where you left off and keep learning." } };
            for (int i = 0; i < 3; i++) {
                Panel card = new Panel { Location = new Point(72 + i * 340, 130), Size = new Size(310, 175), BackColor = Color.FromArgb(248, 249, 252), Padding = new Padding(18) };
                At(card, TextLabel(cards[i, 0], 10, purple, true), 18, 15); At(card, TextLabel(cards[i, 1], 16, ink, true), 18, 45);
                Label d = TextLabel(cards[i, 2], 11, muted, false); d.MaximumSize = new Size(260, 0); At(card, d, 18, 95); p.Controls.Add(card);
            }
        }
        void AddCompatibility() {
            Panel p = Section("compatibility", 235, Color.FromArgb(247, 247, 250));
            At(p, TextLabel("LEARN WHEREVER YOU ARE", 10, purple, true), 72, 35);
            At(p, TextLabel("Your study space,\nwherever you need it.", 30, ink, true), 70, 70);
            At(p, TextLabel("Use ClonBrow on the web, or get the laptop and mobile versions.", 13, muted, false), 570, 94);
            AddAction(p, "Laptop download", 570, 155, Color.White, ink, delegate { Open("https://drive.google.com/drive/folders/1PyECsoYagZZe8G8rzdzDlejmpBczKhoqK?usp=sharing"); });
            AddAction(p, "Mobile download", 745, 155, Color.White, ink, delegate { Open("https://drive.google.com/drive/folders/126VdGHmNEhY9zAb45FsrYaoey7GSyPRp?usp=sharing"); });
        }
        void AddTools() {
            Panel p = Section("tools", 325, Color.White);
            At(p, TextLabel("LESS APP SWITCHING. MORE LEARNING.", 10, purple, true), 72, 35);
            At(p, TextLabel("Make study time\nwork harder for you.", 30, ink, true), 70, 70);
            string[] names = { "Focus sessions", "Flashcards", "Practice quizzes", "Notes" };
            string[] descriptions = { "Set a timer and focus on one task.", "Review your material with quick cards.", "Check your understanding as you go.", "Keep useful ideas and notes together." };
            for (int i = 0; i < 4; i++) { Panel card = new Panel { Location = new Point(585 + (i % 2) * 220, 55 + (i / 2) * 112), Size = new Size(200, 95), BackColor = Color.FromArgb(249, 250, 252), Padding = new Padding(14) }; At(card, TextLabel(names[i], 13, ink, true), 14, 11); Label d = TextLabel(descriptions[i], 10, muted, false); d.MaximumSize = new Size(168, 0); At(card, d, 14, 42); p.Controls.Add(card); }
        }
        void AddVision() {
            Panel p = Section("vision", 255, Color.FromArgb(248, 249, 252));
            At(p, TextLabel("OUR VISION", 10, purple, true), 72, 35); At(p, TextLabel("Software that respects\nyour attention.", 32, ink, true), 70, 70);
            Label d = TextLabel("No ads. No tracking. Just tools designed to help students focus, learn and make progress at their own pace.", 15, muted, false); d.MaximumSize = new Size(760, 0); At(p, d, 74, 185);
        }
        void AddFooter() {
            Panel p = Section("download", 210, Color.White);
            At(p, TextLabel("READY TO GET STARTED?", 10, purple, true), 72, 25); At(p, TextLabel("Make your next study session count.", 28, ink, true), 70, 55); At(p, TextLabel("Choose the version that works for you.", 13, muted, false), 74, 100);
            AddAction(p, "Try online", 74, 145, Color.Black, Color.White, delegate { Open("https://clonbrow.netlify.app/"); });
            AddAction(p, "For laptop", 220, 145, Color.White, ink, delegate { Open("https://drive.google.com/drive/folders/1PyECsoYagZZe8G8rzdzDlejmpBczKhoqK?usp=sharing"); });
            AddAction(p, "For mobile", 365, 145, Color.White, ink, delegate { Open("https://drive.google.com/drive/folders/126VdGHmNEhY9zAb45FsrYaoey7GSyPRp?usp=sharing"); });
        }
        void Open(string url) { try { Process.Start(new ProcessStartInfo(url) { UseShellExecute = true }); } catch { MessageBox.Show("Could not open the link.", "ClonBrow"); } }
    }
}
