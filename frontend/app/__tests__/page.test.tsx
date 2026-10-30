import { render, screen } from "@testing-library/react";
import Home from "../page";

test("renders Blurt", () => {
  render(<Home />);
  expect(screen.getByText("Blurt")).toBeTruthy();
});
