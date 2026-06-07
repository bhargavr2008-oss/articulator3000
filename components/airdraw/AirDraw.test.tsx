import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AirDraw from "./AirDraw";

describe("AirDraw", () => {
  it("renders the idle start control before the camera is enabled", () => {
    render(<AirDraw />);
    expect(screen.getByText(/air-draw studio/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /enable camera & start/i }),
    ).toBeInTheDocument();
  });
});
