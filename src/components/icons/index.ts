import { defineComponent, h } from "vue";

function svgProps(size?: number, className?: string) {
  return {
    xmlns: "http://www.w3.org/2000/svg",
    width: size || 16,
    height: size || 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": 2,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    class: className,
  };
}

export const Menu = defineComponent({
  props: { size: Number, class: String },
  setup(props) {
    return () =>
      h("svg", svgProps(props.size, props.class), [
        h("line", { x1: 4, y1: 12, x2: 20, y2: 12 }),
        h("line", { x1: 4, y1: 6, x2: 20, y2: 6 }),
        h("line", { x1: 4, y1: 18, x2: 20, y2: 18 }),
      ]);
  },
});

export const X = defineComponent({
  props: { size: Number, class: String },
  setup(props) {
    return () =>
      h("svg", svgProps(props.size, props.class), [
        h("line", { x1: 18, y1: 6, x2: 6, y2: 18 }),
        h("line", { x1: 6, y1: 6, x2: 18, y2: 18 }),
      ]);
  },
});

export const Users = defineComponent({
  props: { size: Number, class: String },
  setup(props) {
    return () =>
      h("svg", svgProps(props.size, props.class), [
        h("path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }),
        h("circle", { cx: 9, cy: 7, r: 4 }),
        h("path", { d: "M22 21v-2a4 4 0 0 0-3-3.87" }),
        h("path", { d: "M16 3.13a4 4 0 0 1 0 7.75" }),
      ]);
  },
});

export const LayoutDashboard = defineComponent({
  props: { size: Number, class: String },
  setup(props) {
    return () =>
      h("svg", svgProps(props.size, props.class), [
        h("rect", { x: 3, y: 3, width: 7, height: 7, rx: 1 }),
        h("rect", { x: 14, y: 3, width: 7, height: 7, rx: 1 }),
        h("rect", { x: 14, y: 14, width: 7, height: 7, rx: 1 }),
        h("rect", { x: 3, y: 14, width: 7, height: 7, rx: 1 }),
      ]);
  },
});

export const BookOpen = defineComponent({
  props: { size: Number, class: String },
  setup(props) {
    return () =>
      h("svg", svgProps(props.size, props.class), [
        h("path", { d: "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" }),
        h("path", { d: "M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" }),
      ]);
  },
});

export const Mail = defineComponent({
  props: { size: Number, class: String },
  setup(props) {
    return () =>
      h("svg", svgProps(props.size, props.class), [
        h("path", { d: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" }),
        h("polyline", { points: "22,6 12,13 2,6" }),
      ]);
  },
});

export const ArrowRight = defineComponent({
  props: { size: Number, class: String },
  setup(props) {
    return () =>
      h("svg", svgProps(props.size, props.class), [
        h("line", { x1: 5, y1: 12, x2: 19, y2: 12 }),
        h("polyline", { points: "12 5 19 12 12 19" }),
      ]);
  },
});

export const ArrowLeft = defineComponent({
  props: { size: Number, class: String },
  setup(props) {
    return () =>
      h("svg", svgProps(props.size, props.class), [
        h("line", { x1: 19, y1: 12, x2: 5, y2: 12 }),
        h("polyline", { points: "12 19 5 12 12 5" }),
      ]);
  },
});

export const ArrowUp = defineComponent({
  props: { size: Number, class: String },
  setup(props) {
    return () =>
      h("svg", svgProps(props.size, props.class), [
        h("line", { x1: 12, y1: 19, x2: 12, y2: 5 }),
        h("polyline", { points: "5 12 12 5 19 12" }),
      ]);
  },
});

export const ArrowDown = defineComponent({
  props: { size: Number, class: String },
  setup(props) {
    return () =>
      h("svg", svgProps(props.size, props.class), [
        h("line", { x1: 12, y1: 5, x2: 12, y2: 19 }),
        h("polyline", { points: "19 12 12 19 5 12" }),
      ]);
  },
});

export const Printer = defineComponent({
  props: { size: Number, class: String },
  setup(props) {
    return () =>
      h("svg", svgProps(props.size, props.class), [
        h("polyline", { points: "6 9 6 2 18 2 18 9" }),
        h("path", { d: "M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" }),
        h("rect", { x: 6, y: 14, width: 12, height: 8 }),
      ]);
  },
});

export const Lock = defineComponent({
  props: { size: Number, class: String },
  setup(props) {
    return () =>
      h("svg", svgProps(props.size, props.class), [
        h("rect", { x: 3, y: 11, width: 18, height: 11, rx: 2, ry: 2 }),
        h("path", { d: "M7 11V7a5 5 0 0 1 10 0v4" }),
      ]);
  },
});

export const GraduationCap = defineComponent({
  props: { size: Number, class: String },
  setup(props) {
    return () =>
      h("svg", svgProps(props.size, props.class), [
        h("path", { d: "M22 10v6M2 10l10-5 10 5-10 5z" }),
        h("path", { d: "M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" }),
      ]);
  },
});

export const UserTie = defineComponent({
  props: { size: Number, class: String },
  setup(props) {
    return () =>
      h("svg", svgProps(props.size, props.class), [
        h("path", { d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" }),
        h("circle", { cx: 12, cy: 7, r: 4 }),
        h("path", { d: "M12 11v4" }),
        h("path", { d: "M10 15h4" }),
      ]);
  },
});

export const Wrench = defineComponent({
  props: { size: Number, class: String },
  setup(props) {
    return () =>
      h("svg", svgProps(props.size, props.class), [
        h("path", { d: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" }),
      ]);
  },
});

export const Handshake = defineComponent({
  props: { size: Number, class: String },
  setup(props) {
    return () =>
      h("svg", svgProps(props.size, props.class), [
        h("path", { d: "M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 7.65l.77.77 6.36 6.36.77-.77a5.4 5.4 0 0 0 0-7.65l-.77-.78.77-.78a5.4 5.4 0 0 1 7.65 0l.77.78-.77.78a5.4 5.4 0 0 0 0 7.65l.77.77" }),
        h("path", { d: "M16.5 9.5l-4.5 4.5" }),
        h("path", { d: "M7.5 9.5l4.5 4.5" }),
      ]);
  },
});

export const Check = defineComponent({
  props: { size: Number, class: String },
  setup(props) {
    return () =>
      h("svg", svgProps(props.size, props.class), [
        h("polyline", { points: "20 6 9 17 4 12" }),
      ]);
  },
});

export const CheckCircle = defineComponent({
  props: { size: Number, class: String },
  setup(props) {
    return () =>
      h("svg", svgProps(props.size, props.class), [
        h("path", { d: "M22 11.08V12a10 10 0 1 1-5.93-9.14" }),
        h("polyline", { points: "22 4 12 14.01 9 11.01" }),
      ]);
  },
});

export const CheckCircle2 = defineComponent({
  props: { size: Number, class: String },
  setup(props) {
    return () =>
      h("svg", svgProps(props.size, props.class), [
        h("circle", { cx: 12, cy: 12, r: 10 }),
        h("path", { d: "m9 12 2 2 4-4" }),
      ]);
  },
});

export const XCircle = defineComponent({
  props: { size: Number, class: String },
  setup(props) {
    return () =>
      h("svg", svgProps(props.size, props.class), [
        h("circle", { cx: 12, cy: 12, r: 10 }),
        h("line", { x1: 15, y1: 9, x2: 9, y2: 15 }),
        h("line", { x1: 9, y1: 9, x2: 15, y2: 15 }),
      ]);
  },
});

export const Circle = defineComponent({
  props: { size: Number, class: String },
  setup(props) {
    return () =>
      h("svg", svgProps(props.size, props.class), [
        h("circle", { cx: 12, cy: 12, r: 10 }),
      ]);
  },
});

export const Trash2 = defineComponent({
  props: { size: Number, class: String },
  setup(props) {
    return () =>
      h("svg", svgProps(props.size, props.class), [
        h("polyline", { points: "3 6 5 6 21 6" }),
        h("path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" }),
        h("line", { x1: 10, y1: 11, x2: 10, y2: 17 }),
        h("line", { x1: 14, y1: 11, x2: 14, y2: 17 }),
      ]);
  },
});

export const Settings = defineComponent({
  props: { size: Number, class: String },
  setup(props) {
    return () =>
      h("svg", svgProps(props.size, props.class), [
        h("path", { d: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" }),
        h("circle", { cx: 12, cy: 12, r: 3 }),
      ]);
  },
});

export const Crown = defineComponent({
  props: { size: Number, class: String },
  setup(props) {
    return () =>
      h("svg", svgProps(props.size, props.class), [
        h("path", { d: "m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3-2h14v2H5z" }),
      ]);
  },
});

export const UserPlus = defineComponent({
  props: { size: Number, class: String },
  setup(props) {
    return () =>
      h("svg", svgProps(props.size, props.class), [
        h("path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }),
        h("circle", { cx: 9, cy: 7, r: 4 }),
        h("line", { x1: 19, y1: 8, x2: 19, y2: 14 }),
        h("line", { x1: 22, y1: 11, x2: 16, y2: 11 }),
      ]);
  },
});

export const Plus = defineComponent({
  props: { size: Number, class: String },
  setup(props) {
    return () =>
      h("svg", svgProps(props.size, props.class), [
        h("line", { x1: 12, y1: 5, x2: 12, y2: 19 }),
        h("line", { x1: 5, y1: 12, x2: 19, y2: 12 }),
      ]);
  },
});

export const Upload = defineComponent({
  props: { size: Number, class: String },
  setup(props) {
    return () =>
      h("svg", svgProps(props.size, props.class), [
        h("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
        h("polyline", { points: "17 8 12 3 7 8" }),
        h("line", { x1: 12, y1: 3, x2: 12, y2: 15 }),
      ]);
  },
});

export const FileBarChart = defineComponent({
  props: { size: Number, class: String },
  setup(props) {
    return () =>
      h("svg", svgProps(props.size, props.class), [
        h("path", { d: "M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" }),
        h("polyline", { points: "14 2 14 8 20 8" }),
        h("path", { d: "M12 18v-6" }),
        h("path", { d: "M8 18v-4" }),
        h("path", { d: "M16 18v-2" }),
      ]);
  },
});

export const AlertTriangle = defineComponent({
  props: { size: Number, class: String },
  setup(props) {
    return () =>
      h("svg", svgProps(props.size, props.class), [
        h("path", { d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z" }),
        h("line", { x1: 12, y1: 9, x2: 12, y2: 13 }),
        h("line", { x1: 12, y1: 17, x2: 12.01, y2: 17 }),
      ]);
  },
});

export const Search = defineComponent({
  props: { size: Number, class: String },
  setup(props) {
    return () =>
      h("svg", svgProps(props.size, props.class), [
        h("circle", { cx: 11, cy: 11, r: 8 }),
        h("line", { x1: 21, y1: 21, x2: 16.65, y2: 16.65 }),
      ]);
  },
});

export const Activity = defineComponent({
  props: { size: Number, class: String },
  setup(props) {
    return () =>
      h("svg", svgProps(props.size, props.class), [
        h("polyline", { points: "22 12 18 12 15 21 9 3 6 12 2 12" }),
      ]);
  },
});

export const Award = defineComponent({
  props: { size: Number, class: String },
  setup(props) {
    return () =>
      h("svg", svgProps(props.size, props.class), [
        h("circle", { cx: 12, cy: 8, r: 7 }),
        h("polyline", { points: "8.21 13.89 7 23 12 20 17 23 15.79 13.88" }),
      ]);
  },
});

export const Briefcase = defineComponent({
  props: { size: Number, class: String },
  setup(props) {
    return () =>
      h("svg", svgProps(props.size, props.class), [
        h("rect", { x: 2, y: 7, width: 20, height: 14, rx: 2, ry: 2 }),
        h("path", { d: "M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" }),
      ]);
  },
});

export const LogOut = defineComponent({
  props: { size: Number, class: String },
  setup(props) {
    return () =>
      h("svg", svgProps(props.size, props.class), [
        h("path", { d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" }),
        h("polyline", { points: "16 17 21 12 16 7" }),
        h("line", { x1: 21, y1: 12, x2: 9, y2: 12 }),
      ]);
  },
});

export const FileCheck = defineComponent({
  props: { size: Number, class: String },
  setup(props) {
    return () =>
      h("svg", svgProps(props.size, props.class), [
        h("path", { d: "M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" }),
        h("polyline", { points: "14 2 14 8 20 8" }),
        h("path", { d: "m9 15 2 2 4-4" }),
      ]);
  },
});

export const Globe = defineComponent({
  props: { size: Number, class: String },
  setup(props) {
    return () =>
      h("svg", svgProps(props.size, props.class), [
        h("circle", { cx: 12, cy: 12, r: 10 }),
        h("line", { x1: 2, y1: 12, x2: 22, y2: 12 }),
        h("path", { d: "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" }),
      ]);
  },
});

export const ShieldCheck = defineComponent({
  props: { size: Number, class: String },
  setup(props) {
    return () =>
      h("svg", svgProps(props.size, props.class), [
        h("path", { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" }),
        h("path", { d: "m9 12 2 2 4-4" }),
      ]);
  },
});

export const Rocket = defineComponent({
  props: { size: Number, class: String },
  setup(props) {
    return () =>
      h("svg", svgProps(props.size, props.class), [
        h("path", { d: "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" }),
        h("path", { d: "m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" }),
        h("path", { d: "M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" }),
        h("path", { d: "M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" }),
      ]);
  },
});

export const BarChart3 = defineComponent({
  props: { size: Number, class: String },
  setup(props) {
    return () =>
      h("svg", svgProps(props.size, props.class), [
        h("path", { d: "M18 20V10" }),
        h("path", { d: "M12 20V4" }),
        h("path", { d: "M6 20v-6" }),
      ]);
  },
});

export const Layers = defineComponent({
  props: { size: Number, class: String },
  setup(props) {
    return () =>
      h("svg", svgProps(props.size, props.class), [
        h("polygon", { points: "12 2 2 7 12 12 22 7 12 2" }),
        h("polyline", { points: "2 17 12 22 22 17" }),
        h("polyline", { points: "2 12 12 17 22 12" }),
      ]);
  },
});
