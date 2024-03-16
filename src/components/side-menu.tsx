import SearchDetailedForm from "./search-detailed-form";

export default function SideMenu({ children }: { children: React.ReactNode }) {
  return (
    <div className="drawer lg:drawer-open">
      <input id="my-drawer" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content">
        {/* Page content here */}
        <div className="flex flex-col">
          <div className="flex p-4 m-2 items-center justify-center">
            <label
              className="lg:hidden btn btn-primary w-1/2 drawer-button"
              htmlFor="my-drawer"
            >
              検索パネル
            </label>
          </div>
          <div>{children}</div>
        </div>
      </div>
      <div className="drawer-side">
        <label
          htmlFor="my-drawer"
          aria-label="close sidebar"
          className="drawer-overlay"
        ></label>

        <div className="bg-base-100">
          <SearchDetailedForm />
        </div>
      </div>
    </div>
  );
}
