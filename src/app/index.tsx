import { invoke } from '@tauri-apps/api'
import { useEffect } from 'react'

interface Props {
  children: React.ReactNode
}
export const App = (props: Props) => {
  // useEffect(() => {
  //       invoke('init_node', { password: 'password' })
  //         .then((res) => {
  //           console.log(res);
  //         })
  //         .catch((err) => {
  //           console.log(err);
  //         });
  //       invoke('nodeinfo')
  //         .then((res) => { console.log(res); })
  //         .catch((err) => { console.log(err); } );
  //   }, []);

  return <> {props.children} </>
}
