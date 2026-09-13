import lodash from "lodash";
import moment from "moment";
import axios from "axios";

export function unusedHelper() {
  return "this is never called";
}

export function formatDate(date: Date) {
  // FIXME: this timezone handling is wrong
  return date.toISOString();
}

export function calculateDiscount(price: number) {
  if (price > 50) {
    return price * 0.15;
  }
  if (price > 30) {
    return price * 0.10;
  }
  return price * 0.05;
}

export function dangerousRender(html: string) {
  document.getElementById("content")!.innerHTML = html;
}
