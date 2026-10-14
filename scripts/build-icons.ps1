# Export platform sizes from the original artwork without redrawing it.
# Run on Windows: powershell -NoProfile -File scripts/build-icons.ps1
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$taskIconRoot = Split-Path -Parent $PSScriptRoot
$taskIconSource = Join-Path $taskIconRoot 'resources/app-icon-original.png'
$taskIconAdaptiveSource = Join-Path $taskIconRoot 'resources/app-icon-maskable.png'
$taskIconAssets = Join-Path $taskIconRoot 'public/assets'
$taskIconPreview = Join-Path $taskIconRoot 'docs/preview-home-icons.png'

Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;

public static class CdgIconExport {
    static Bitmap Canvas(int size) { return new Bitmap(size, size, PixelFormat.Format24bppRgb); }
    static void Quality(Graphics g) {
        g.CompositingQuality = CompositingQuality.HighQuality;
        g.InterpolationMode = InterpolationMode.HighQualityBicubic;
        g.PixelOffsetMode = PixelOffsetMode.HighQuality;
        g.SmoothingMode = SmoothingMode.AntiAlias;
    }
    static Color Mix(Color a, Color b, double t) {
        return Color.FromArgb((int)(a.R + (b.R-a.R)*t), (int)(a.G + (b.G-a.G)*t), (int)(a.B + (b.B-a.B)*t));
    }
    static int ByteRange(double value) { return Math.Max(0,Math.Min(255,(int)Math.Round(value))); }
    // Extend only the transparent outer corners; opaque artwork pixels are retained.
    static Bitmap OpaqueOriginal(Bitmap source) {
        int n = source.Width;
        var output = Canvas(n);
        Color left = Color.FromArgb(211, 113, 241), right = Color.FromArgb(114, 77, 228);
        for (int y = 0; y < n; y++) {
            int first = -1, last = -1;
            for (int x = 0; x < n; x++) {
                if (source.GetPixel(x,y).A == 255) { if (first < 0) first = x; last = x; }
            }
            if (first >= 0) { left = source.GetPixel(first,y); right = source.GetPixel(last,y); }
            for (int x = 0; x < n; x++) output.SetPixel(x,y,Mix(left,right,x/(double)(n-1)));
        }
        using (var g = Graphics.FromImage(output)) g.DrawImageUnscaled(source,0,0);
        return output;
    }
    // Add a small safety margin around the maskable composition.
    // Extend the actual edge colors without an inner tile or transparent border.
    static Bitmap Adaptive(Bitmap regular) {
        int n = regular.Width, paddedSize = (int)Math.Ceiling(n/.94);
        int inset = (paddedSize-n)/2;
        var output = Canvas(n);
        using (var padded = Canvas(paddedSize)) {
            for (int y = 0; y < paddedSize; y++) for (int x = 0; x < paddedSize; x++) {
                int sx = Math.Max(0,Math.Min(n-1,x-inset)), sy = Math.Max(0,Math.Min(n-1,y-inset));
                var c = regular.GetPixel(sx,sy); double r = c.R, green = c.G, b = c.B;
                if (x-inset!=sx) {
                    var inner = regular.GetPixel(sx==0?32:n-33,sy);
                    double distance = Math.Abs(x-inset-sx)/32.0;
                    r+=(c.R-inner.R)*distance; green+=(c.G-inner.G)*distance; b+=(c.B-inner.B)*distance;
                }
                if (y-inset!=sy) {
                    var inner = regular.GetPixel(sx,sy==0?32:n-33);
                    double distance = Math.Abs(y-inset-sy)/32.0;
                    r+=(c.R-inner.R)*distance; green+=(c.G-inner.G)*distance; b+=(c.B-inner.B)*distance;
                }
                padded.SetPixel(x,y,Color.FromArgb(ByteRange(r),ByteRange(green),ByteRange(b)));
            }
            using (var g = Graphics.FromImage(output)) {
                Quality(g);
                using (var wrap = new ImageAttributes()) {
                    wrap.SetWrapMode(WrapMode.TileFlipXY);
                    g.DrawImage(padded,new Rectangle(0,0,n,n),0,0,paddedSize,paddedSize,GraphicsUnit.Pixel,wrap);
                }
            }
        }
        return output;
    }
    static void SaveSize(Bitmap source, int size, string file) {
        using (var output = Canvas(size)) using (var g = Graphics.FromImage(output)) {
            Quality(g);
            using (var wrap = new ImageAttributes()) {
                wrap.SetWrapMode(WrapMode.TileFlipXY);
                g.DrawImage(source,new Rectangle(0,0,size,size),0,0,source.Width,source.Height,GraphicsUnit.Pixel,wrap);
            }
            output.Save(file,ImageFormat.Png);
        }
    }
    static GraphicsPath RoundRect(float x,float y,float size,float radius) {
        var path = new GraphicsPath(); float d = radius*2;
        path.AddArc(x,y,d,d,180,90); path.AddArc(x+size-d,y,d,d,270,90);
        path.AddArc(x+size-d,y+size-d,d,d,0,90); path.AddArc(x,y+size-d,d,d,90,90);
        path.CloseFigure(); return path;
    }
    static void Preview(Bitmap regular,Bitmap adaptive,string file) {
        using (var sheet = new Bitmap(1000,320)) using (var g = Graphics.FromImage(sheet))
        using (var heading = new Font("Segoe UI",15,FontStyle.Bold)) using (var caption = new Font("Segoe UI",10)) {
            Quality(g); g.Clear(Color.FromArgb(245,245,249));
            string[] labels = { "iPhone / iPad", "Android - rond", "Android - arrondi", "Android - zone sure" };
            for (int i=0;i<4;i++) {
                float x = 30+i*250, y = 62, size = 190;
                g.DrawString(labels[i],heading,Brushes.Black,x,18);
                using (var shape = i==1 || i==3 ? new GraphicsPath() : RoundRect(x,y,size,i==0?42:35)) {
                    if (i==1) shape.AddEllipse(x,y,size,size);
                    if (i==3) shape.AddEllipse(x+size*.10f,y+size*.10f,size*.80f,size*.80f);
                    var state = g.Save(); g.SetClip(shape);
                    g.DrawImage(i==0?regular:adaptive,new RectangleF(x,y,size,size)); g.Restore(state);
                }
            }
            g.DrawString("Simulations des decoupes : l'avion et le repere CDG restent visibles.",caption,Brushes.DimGray,30,278);
            sheet.Save(file,ImageFormat.Png);
        }
    }
    public static void Run(string input,string adaptiveInput,string assets,string preview) {
        using (var source = new Bitmap(input)) {
            if (source.Width!=512 || source.Height!=512) throw new InvalidDataException("Expected the original 512 x 512 icon.");
            using (var adaptiveSource = new Bitmap(adaptiveInput))
            using (var regular = OpaqueOriginal(source)) using (var adaptive = Adaptive(adaptiveSource)) {
                if (adaptiveSource.Width!=adaptiveSource.Height || adaptiveSource.Width<512) throw new InvalidDataException("Expected a square maskable source at least 512 px wide.");
                foreach (int size in new[]{192,512}) {
                    SaveSize(regular,size,Path.Combine(assets,"app-icon-v2-"+size+".png"));
                    SaveSize(adaptive,size,Path.Combine(assets,"app-icon-maskable-v2-"+size+".png"));
                }
                foreach (int size in new[]{152,167,180}) SaveSize(regular,size,Path.Combine(assets,"apple-touch-icon-v2-"+size+".png"));
                // ICO frames are PNG-compressed, retaining the same artwork.
                using (var output = new BinaryWriter(File.Create(Path.Combine(assets,"favicon-v2.ico")))) {
                    int[] sizes = {16,32,48}; var frames = new byte[sizes.Length][];
                    for (int i=0;i<sizes.Length;i++) using (var small = Canvas(sizes[i])) using (var g = Graphics.FromImage(small)) using (var memory = new MemoryStream()) {
                        Quality(g); g.DrawImage(regular,new Rectangle(0,0,sizes[i],sizes[i]));
                        small.Save(memory,ImageFormat.Png); frames[i] = memory.ToArray();
                    }
                    output.Write((ushort)0); output.Write((ushort)1); output.Write((ushort)sizes.Length);
                    int offset = 6+16*sizes.Length;
                    for (int i=0;i<sizes.Length;i++) {
                        output.Write((byte)sizes[i]); output.Write((byte)sizes[i]); output.Write((byte)0); output.Write((byte)0);
                        output.Write((ushort)1); output.Write((ushort)24); output.Write(frames[i].Length); output.Write(offset); offset+=frames[i].Length;
                    }
                    foreach (var frame in frames) output.Write(frame);
                }
                Preview(regular,adaptive,preview);
            }
        }
    }
}
'@
[CdgIconExport]::Run($taskIconSource, $taskIconAdaptiveSource, $taskIconAssets, $taskIconPreview)
Write-Output 'Exported Apple, standard and adaptive Android icons from the original artwork.'
