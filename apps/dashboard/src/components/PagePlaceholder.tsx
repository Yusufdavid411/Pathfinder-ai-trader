type PagePlaceholderProps = {
  title: string;
};

export function PagePlaceholder({ title }: PagePlaceholderProps) {
  return <main>{title}</main>;
}
